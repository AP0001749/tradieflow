import { NextResponse } from "next/server";

import { getAppOrigin } from "@/lib/app-origin";
import { createClient } from "@/lib/supabase/server";
import { ensureProfileExists } from "@/lib/profiles";
import { getStripeServer } from "@/utils/stripe/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await request.json().catch(() => null);

    const priceId = process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID;

    if (!priceId) {
      return NextResponse.json(
        { error: "Billing is not configured" },
        { status: 503 }
      );
    }

    await ensureProfileExists(user);

    const stripe = getStripeServer();

    // Load profile to reuse or create Stripe customer
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
    }

    let stripeCustomerId =
      (profile as { stripe_customer_id?: string | null } | null)?.stripe_customer_id ??
      null;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { userId: user.id },
      });

      stripeCustomerId = customer.id;

      const { data: updatedProfile, error: updateError } = await supabase
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

    const origin = getAppOrigin();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/dashboard/billing?success=true`,
      cancel_url: `${origin}/dashboard/billing?canceled=true`,
      metadata: { userId: user.id },
      subscription_data: {
        metadata: { userId: user.id },
      },
      client_reference_id: user.id,
      allow_promotion_codes: true,
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
