import { NextResponse } from "next/server";

import { getAppOrigin } from "@/lib/app-origin";
import { getPlanPriceId, normalizePlanKey } from "@/lib/pricing";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ensureProfileExists } from "@/lib/profiles";
import { getStripeServer } from "@/utils/stripe/server";

export const runtime = "nodejs";

const ACTIVE_SUBSCRIPTION_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
]);

type BillingProfile = {
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string | null;
};

async function createBillingPortalRedirect(
  stripe: ReturnType<typeof getStripeServer>,
  customerId: string,
  origin: string
) {
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${origin}/dashboard/billing`,
  });

  return NextResponse.json({
    sessionId: null,
    url: portalSession.url,
    mode: "portal",
  });
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as {
      planKey?: string;
    } | null;

    const planKey = normalizePlanKey(body?.planKey);
    const priceId = getPlanPriceId(planKey);

    if (!priceId) {
      return NextResponse.json(
        { error: `Billing is not configured for the ${planKey} plan` },
        { status: 503 }
      );
    }

    await ensureProfileExists(user);

    const stripe = getStripeServer();
    const origin = getAppOrigin();

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("stripe_customer_id, stripe_subscription_id, subscription_status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
      return NextResponse.json({ error: "Failed to load billing profile" }, { status: 500 });
    }

    const billingProfile = (profile || null) as BillingProfile | null;
    let stripeCustomerId = billingProfile?.stripe_customer_id ?? null;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { userId: user.id },
      });

      stripeCustomerId = customer.id;

      // Billing identifiers are writable only by trusted server/service-role operations.
      const supabaseAdmin = createAdminClient();
      const { data: updatedProfile, error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({ stripe_customer_id: stripeCustomerId })
        .eq("user_id", user.id)
        .select("user_id")
        .maybeSingle();

      if (updateError) {
        console.error("Error saving stripe_customer_id:", updateError);
        return NextResponse.json({ error: "Failed to save billing profile" }, { status: 500 });
      }

      if (!updatedProfile) {
        console.error("No profile row matched while saving stripe_customer_id:", user.id);
        return NextResponse.json({ error: "Billing profile not found" }, { status: 500 });
      }
    }

    // Prefer live Stripe state so upgrades never create a second paid subscription.
    const existingSubscriptions = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      status: "all",
      limit: 20,
    });

    const livePaidSubscription = existingSubscriptions.data.find((subscription) =>
      ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status)
    );

    if (livePaidSubscription) {
      return createBillingPortalRedirect(stripe, stripeCustomerId, origin);
    }

    if (
      billingProfile?.stripe_subscription_id &&
      ACTIVE_SUBSCRIPTION_STATUSES.has(billingProfile.subscription_status || "")
    ) {
      return createBillingPortalRedirect(stripe, stripeCustomerId, origin);
    }

    // Reuse an open Checkout session for the same customer + price when possible.
    const openSessions = await stripe.checkout.sessions.list({
      customer: stripeCustomerId,
      limit: 20,
    });

    const reusableSession = openSessions.data.find((session) => {
      if (session.status !== "open" || session.mode !== "subscription") {
        return false;
      }

      const sessionPlanKey = normalizePlanKey(session.metadata?.planKey);
      return sessionPlanKey === planKey && Boolean(session.url);
    });

    if (reusableSession?.url) {
      return NextResponse.json({
        sessionId: reusableSession.id,
        url: reusableSession.url,
        mode: "checkout",
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/dashboard/billing?success=true&plan=${planKey}`,
      cancel_url: `${origin}/dashboard/billing?canceled=true`,
      metadata: { userId: user.id, planKey },
      subscription_data: {
        metadata: { userId: user.id, planKey },
      },
      client_reference_id: user.id,
      allow_promotion_codes: true,
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
      mode: "checkout",
    });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
