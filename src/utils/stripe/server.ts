import "server-only";

import Stripe from "stripe";

export function getStripeServer() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }

  return new Stripe(secretKey, {
    // Keep this stable; Stripe recommends pinning.
    apiVersion: "2025-12-15.clover",
    typescript: true,
  });
}
