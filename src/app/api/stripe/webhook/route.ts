import { NextResponse } from "next/server";

import { headers } from "next/headers";
import {
  getPlanKeyForPriceId,
  getEffectiveSubscriptionPlanKey,
  normalizePlanKey,
} from "@/lib/pricing";
import { getStripeServer } from "@/utils/stripe/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TERMINAL_WEBHOOK_STATUSES = new Set(["processed", "ignored"]);

type StripeEventLog = {
  delivery_count: number | null;
  id: string;
  status: string | null;
};

type StripeEventOutcomeStatus = "processed" | "failed" | "ignored";

function isMissingSubscriptionPlanKeyColumnError(error: unknown) {
  if (!error || typeof error !== "object" || !("message" in error)) {
    return false;
  }

  return String(error.message).includes("subscription_plan_key");
}

function getPlanKeyFromSubscription(subscription: Stripe.Subscription) {
  const activePriceId = subscription.items.data[0]?.price?.id;
  return (
    getPlanKeyForPriceId(activePriceId) ??
    normalizePlanKey(subscription.metadata?.planKey)
  );
}

function getWebhookDiagnostic(error: unknown) {
  if (error instanceof Error) {
    const details = error.stack || error.message;
    return details.slice(0, 2000);
  }

  if (typeof error === "string") {
    return error.slice(0, 2000);
  }

  try {
    return JSON.stringify(error).slice(0, 2000);
  } catch {
    return "Unknown webhook error";
  }
}

function getStripeObjectId(event: Stripe.Event) {
  const object = event.data.object as { id?: unknown } | undefined;
  return typeof object?.id === "string" ? object.id : null;
}

async function recordStripeEventOutcome(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  event: Stripe.Event,
  existingEvent: StripeEventLog | null,
  status: StripeEventOutcomeStatus,
  details: string | null = null
) {
  const now = new Date().toISOString();
  const { error } = await supabaseAdmin
    .from("stripe_events")
    .upsert(
      {
        id: event.id,
        event_type: event.type,
        object_id: getStripeObjectId(event),
        status,
        processed_at: status === "failed" ? null : now,
        last_delivery_at: now,
        delivery_count: Math.max(existingEvent?.delivery_count ?? 0, 0) + 1,
        last_error: details,
      },
      { onConflict: "id" }
    );

  if (error) {
    throw error;
  }
}

async function updateProfileByUserId(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  userId: string,
  update: Record<string, unknown>
) {
  const runUpdate = async (payload: Record<string, unknown>) =>
    supabaseAdmin
      .from("profiles")
      .update(payload)
      .eq("user_id", userId)
      .select("user_id")
      .maybeSingle();

  let { data: updatedProfile, error: updateError } = await runUpdate(update);

  if (
    updateError &&
    "subscription_plan_key" in update &&
    isMissingSubscriptionPlanKeyColumnError(updateError)
  ) {
    console.warn(
      "profiles.subscription_plan_key is missing; retrying webhook profile update without plan key.",
    );

    const legacyUpdate = { ...update };
    delete legacyUpdate.subscription_plan_key;
    ({ data: updatedProfile, error: updateError } = await runUpdate(legacyUpdate));
  }

  if (updateError) {
    return { error: updateError, updatedProfile: null };
  }

  if (!updatedProfile) {
    return {
      error: new Error(`Profile not found for user_id ${userId}`),
      updatedProfile: null,
    };
  }

  return { error: null, updatedProfile };
}

async function resolveProfileUserIdForSubscriptionEvent(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  customerId: string | undefined,
  subscriptionId: string,
  metadataUserId: string | undefined
) {
  if (customerId) {
    const { data: customerProfile, error: customerLookupError } = await supabaseAdmin
      .from("profiles")
      .select("user_id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();

    if (customerLookupError) {
      throw new Error(
        `Failed to look up profile by customer ID ${customerId}: ${getWebhookDiagnostic(customerLookupError)}`
      );
    }

    const resolvedCustomerUserId = (customerProfile as { user_id?: string } | null)?.user_id;
    if (resolvedCustomerUserId) {
      return resolvedCustomerUserId;
    }
  }

  const { data: subscriptionProfile, error: subscriptionLookupError } = await supabaseAdmin
    .from("profiles")
    .select("user_id")
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle();

  if (subscriptionLookupError) {
    throw new Error(
      `Failed to look up profile by subscription ID ${subscriptionId}: ${getWebhookDiagnostic(subscriptionLookupError)}`
    );
  }

  return (subscriptionProfile as { user_id?: string } | null)?.user_id ?? metadataUserId ?? null;
}

export async function POST(request: Request) {
  const stripe = getStripeServer();
  const supabaseAdmin = createAdminClient();

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("Missing STRIPE_WEBHOOK_SECRET");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  // CRITICAL: use raw body for signature verification
  const rawBody = await request.text();

  const signature = (await headers()).get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let event: ReturnType<typeof stripe.webhooks.constructEvent>;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let existingEvent: StripeEventLog | null = null;

  try {
    const { data: existingEventRow, error: existingEventError } = await supabaseAdmin
      .from("stripe_events")
      .select("id, status, delivery_count")
      .eq("id", event.id)
      .maybeSingle();

    if (existingEventError) {
      console.error("Failed to check Stripe event:", existingEventError);
      return NextResponse.json({ error: "Webhook event lookup failed" }, { status: 500 });
    }

    existingEvent = existingEventRow as StripeEventLog | null;

    if (existingEvent && TERMINAL_WEBHOOK_STATUSES.has(existingEvent.status ?? "")) {
      return NextResponse.json({ received: true });
    }

    let outcomeStatus: StripeEventOutcomeStatus = "processed";
    let outcomeDetails: string | null = null;

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId =
          (session?.metadata?.userId as string | undefined) ||
          (typeof session?.client_reference_id === "string"
            ? session.client_reference_id
            : undefined);
        const customerId =
          typeof session?.customer === "string" ? (session.customer as string) : undefined;
        const subscriptionId =
          typeof session?.subscription === "string"
            ? (session.subscription as string)
            : undefined;

        if (!userId) {
          outcomeStatus = "ignored";
          outcomeDetails =
            "checkout.session.completed missing metadata.userId and client_reference_id";
          break;
        }

        const planKey = normalizePlanKey(session?.metadata?.planKey);
        const update: Record<string, unknown> = {
          subscription_tier: "pro",
          subscription_plan_key: planKey,
          subscription_status: "active",
        };

        if (customerId) {
          update.stripe_customer_id = customerId;
        }
        if (subscriptionId) {
          update.stripe_subscription_id = subscriptionId;
          update.subscription_start_date = new Date().toISOString();
        }

        const { error: updateError } = await updateProfileByUserId(
          supabaseAdmin,
          userId,
          update
        );

        if (updateError) {
          throw new Error(
            `Failed to update checkout profile for user ${userId}: ${getWebhookDiagnostic(updateError)}`
          );
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === "string"
            ? (subscription.customer as string)
            : undefined;

        const metadataUserId =
          typeof subscription.metadata?.userId === "string"
            ? subscription.metadata.userId
            : undefined;
        const resolvedUserId = await resolveProfileUserIdForSubscriptionEvent(
          supabaseAdmin,
          customerId,
          subscription.id,
          metadataUserId
        );

        if (!resolvedUserId) {
          outcomeStatus = "ignored";
          outcomeDetails = `No profile found for subscription event ${event.type} (customer ${customerId ?? "unknown"}, subscription ${subscription.id})`;
          break;
        }

        const isActive = subscription.status === "active" || subscription.status === "trialing" || subscription.status === "past_due";
        const planKey = getPlanKeyFromSubscription(subscription);
        const effectivePlanKey = getEffectiveSubscriptionPlanKey({
          subscriptionPlanKey: planKey,
          subscriptionTier: isActive ? "pro" : "free",
          subscriptionStatus: subscription.status,
        });

        const update: Record<string, unknown> = {
          subscription_tier: isActive ? "pro" : "free",
          subscription_plan_key: effectivePlanKey,
          subscription_status: subscription.status,
          stripe_subscription_id: subscription.id,
        };

        if (customerId) {
          update.stripe_customer_id = customerId;
        }

        // Add period dates - Stripe timestamps are in seconds
        const periodStart = (subscription as unknown as Record<string, unknown>).current_period_start as number | undefined;
        const periodEnd = (subscription as unknown as Record<string, unknown>).current_period_end as number | undefined;
        
        if (periodStart) {
          update.subscription_start_date = new Date(periodStart * 1000).toISOString();
        }
        if (periodEnd) {
          update.subscription_end_date = new Date(periodEnd * 1000).toISOString();
        }

        const { error: updateError } = await updateProfileByUserId(
          supabaseAdmin,
          resolvedUserId,
          update
        );

        if (updateError) {
          throw new Error(
            `Failed to update subscription ${subscription.id}: ${getWebhookDiagnostic(updateError)}`
          );
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === "string"
            ? (subscription.customer as string)
            : undefined;

        const metadataUserId =
          typeof subscription.metadata?.userId === "string"
            ? subscription.metadata.userId
            : undefined;
        const resolvedUserId = await resolveProfileUserIdForSubscriptionEvent(
          supabaseAdmin,
          customerId,
          subscription.id,
          metadataUserId
        );

        if (!resolvedUserId) {
          outcomeStatus = "ignored";
          outcomeDetails = `No profile found for deleted subscription ${subscription.id} (customer ${customerId ?? "unknown"})`;
          break;
        }

        // Downgrade to free tier when subscription is deleted
        const { error: updateError } = await updateProfileByUserId(
          supabaseAdmin,
          resolvedUserId,
          {
            subscription_tier: "free",
            subscription_plan_key: "free",
            subscription_status: "canceled",
            stripe_customer_id: customerId,
            stripe_subscription_id: subscription.id,
            subscription_end_date: new Date().toISOString(),
          }
        );

        if (updateError) {
          throw new Error(
            `Failed to downgrade subscription ${subscription.id}: ${getWebhookDiagnostic(updateError)}`
          );
        }
        break;
      }

      default:
        outcomeStatus = "ignored";
        outcomeDetails = `Unhandled event type: ${event.type}`;
    }

    await recordStripeEventOutcome(
      supabaseAdmin,
      event,
      existingEvent,
      outcomeStatus,
      outcomeDetails
    );

    if (outcomeStatus === "ignored" && outcomeDetails) {
      console.warn(outcomeDetails);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    try {
      await recordStripeEventOutcome(
        supabaseAdmin,
        event,
        existingEvent,
        "failed",
        getWebhookDiagnostic(error)
      );
    } catch (eventLogError) {
      console.error("Failed to persist Stripe event failure:", eventLogError);
    }

    console.error("Webhook handler error:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
