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

  try {
    const { data: existingEvent, error: existingEventError } = await supabaseAdmin
      .from("stripe_events")
      .select("id")
      .eq("id", event.id)
      .maybeSingle();

    if (existingEventError) {
      console.error("Failed to check Stripe event:", existingEventError);
      return NextResponse.json({ error: "Webhook event lookup failed" }, { status: 500 });
    }

    if (existingEvent) {
      return NextResponse.json({ received: true });
    }

    // Claim the event BEFORE processing so that any Stripe retry hits the
    // idempotency check above and returns 200 without reprocessing.
    // Profile/subscription updates are idempotent, but stripe_events acts as
    // the authoritative guard against double-execution.
    const { error: claimError } = await supabaseAdmin
      .from("stripe_events")
      .insert({ id: event.id, event_type: event.type });

    if (claimError && claimError.code !== "23505") {
      console.error("Failed to claim Stripe event:", claimError);
      return NextResponse.json({ error: "Webhook event claim failed" }, { status: 500 });
    }

    // Duplicate delivery: another worker already claimed this event.
    if (claimError?.code === "23505") {
      return NextResponse.json({ received: true });
    }

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
          console.error("checkout.session.completed missing metadata.userId");
          return NextResponse.json({ error: "Missing userId in metadata" }, { status: 400 });
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
          console.error("Error updating profile after checkout:", updateError);
          return NextResponse.json({ error: "DB update failed" }, { status: 500 });
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

        if (!customerId) {
          console.error("Subscription event missing customer ID");
          return NextResponse.json({ received: true });
        }

        // Find user by stripe_customer_id
        const { data: profile, error: profileLookupError } = await supabaseAdmin
          .from("profiles")
          .select("user_id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();

        if (profileLookupError) {
          console.error("Error looking up profile by customer ID:", profileLookupError);
          return NextResponse.json({ error: "DB lookup failed" }, { status: 500 });
        }

        const metadataUserId =
          typeof subscription.metadata?.userId === "string"
            ? subscription.metadata.userId
            : undefined;
        const resolvedUserId = (profile as { user_id?: string } | null)?.user_id ?? metadataUserId;

        if (!resolvedUserId) {
          console.error("No profile found for customer:", customerId);
          return NextResponse.json({ received: true });
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
          stripe_customer_id: customerId,
          stripe_subscription_id: subscription.id,
        };

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
          console.error("Error updating subscription:", updateError);
          return NextResponse.json({ error: "DB update failed" }, { status: 500 });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === "string"
            ? (subscription.customer as string)
            : undefined;

        if (!customerId) {
          console.error("Subscription deleted event missing customer ID");
          return NextResponse.json({ received: true });
        }

        // Find user by stripe_customer_id
        const { data: profile, error: profileLookupError } = await supabaseAdmin
          .from("profiles")
          .select("user_id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();

        if (profileLookupError) {
          console.error("Error looking up profile for deleted subscription:", profileLookupError);
          return NextResponse.json({ error: "DB lookup failed" }, { status: 500 });
        }

        const metadataUserId =
          typeof subscription.metadata?.userId === "string"
            ? subscription.metadata.userId
            : undefined;
        const resolvedUserId = (profile as { user_id?: string } | null)?.user_id ?? metadataUserId;

        if (!resolvedUserId) {
          console.error("No profile found for customer:", customerId);
          return NextResponse.json({ received: true });
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
            subscription_end_date: new Date().toISOString(),
          }
        );

        if (updateError) {
          console.error("Error downgrading subscription:", updateError);
          return NextResponse.json({ error: "DB update failed" }, { status: 500 });
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
