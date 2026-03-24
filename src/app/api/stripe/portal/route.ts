import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
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

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
      return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
    }

    const stripeCustomerId =
      (profile as { stripe_customer_id?: string | null } | null)?.stripe_customer_id ??
      null;

    if (!stripeCustomerId) {
      return NextResponse.json(
        { error: "No Stripe customer on file" },
        { status: 400 }
      );
    }

    const stripe = getStripeServer();

    const origin =
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000";

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${origin}/dashboard/billing`,
    });

    // Support both fetch() callers and <form> posts.
    const accept = request.headers.get("accept") || "";
    if (accept.includes("application/json")) {
      return NextResponse.json({ url: portalSession.url });
    }

    return NextResponse.redirect(portalSession.url, 303);
  } catch (error) {
    console.error("Stripe portal error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
