import { NextResponse } from "next/server";

import { headers } from "next/headers";
import { getStripeServer } from "@/utils/stripe/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as any;

      const userId = session?.metadata?.userId as string | undefined;
      const customerId =
        typeof session?.customer === "string" ? (session.customer as string) : undefined;

      if (!userId) {
        console.error("checkout.session.completed missing metadata.userId");
        return NextResponse.json({ received: true });
      }

      const update: Record<string, unknown> = {
        subscription_tier: "pro",
      };

      if (customerId) {
        update.stripe_customer_id = customerId;
      }

      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update(update)
        .eq("user_id", userId);

      if (updateError) {
        console.error("Error updating profile subscription tier:", updateError);
        return NextResponse.json({ error: "DB update failed" }, { status: 500 });
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
