import { NextResponse } from "next/server";

import { headers } from "next/headers";
import { getStripeServer } from "@/utils/stripe/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session?.metadata?.userId as string | undefined;
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

        const update: Record<string, unknown> = {
          subscription_tier: "pro",
          subscription_status: "active",
        };

        if (customerId) {
          update.stripe_customer_id = customerId;
        }
        if (subscriptionId) {
          update.stripe_subscription_id = subscriptionId;
          update.subscription_start_date = new Date().toISOString();
        }

        const { error: updateError } = await supabaseAdmin
          .from("profiles")
          .update(update)
          .eq("user_id", userId);

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
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("user_id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();

        if (!profile) {
          console.error("No profile found for customer:", customerId);
          return NextResponse.json({ received: true });
        }

        const isActive = subscription.status === "active" || subscription.status === "trialing" || subscription.status === "past_due";

        const update: Record<string, unknown> = {
          subscription_tier: isActive ? "pro" : "free",
          subscription_status: subscription.status,
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

        const { error: updateError } = await supabaseAdmin
          .from("profiles")
          .update(update)
          .eq("user_id", (profile as { user_id: string }).user_id);

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
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("user_id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();

        if (!profile) {
          console.error("No profile found for customer:", customerId);
          return NextResponse.json({ received: true });
        }

        // Downgrade to free tier when subscription is deleted
        const { error: updateError } = await supabaseAdmin
          .from("profiles")
          .update({
            subscription_tier: "free",
            subscription_status: "canceled",
            subscription_end_date: new Date().toISOString(),
          })
          .eq("user_id", (profile as { user_id: string }).user_id);

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
