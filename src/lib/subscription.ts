"use server";

import { createClient } from "@/lib/supabase/server";

// Free tier limits
const FREE_TIER_LIMITS = {
  maxClients: 3,
  maxJobs: 5,
  maxInvoices: 10,
};

export async function checkSubscriptionLimits() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { 
      canProceed: false, 
      error: "Unauthorized",
      isPro: false 
    };
  }

  // Get user's subscription tier
  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier, subscription_status")
    .eq("user_id", user.id)
    .maybeSingle();

  const tier = (profile as { subscription_tier?: string | null; subscription_status?: string | null } | null)?.subscription_tier ?? "free";
  const status = (profile as { subscription_tier?: string | null; subscription_status?: string | null } | null)?.subscription_status ?? null;
  
  // Pro users with active or trialing subscriptions have no limits
  // Also allow "past_due" to give users grace period to update payment
  if (tier === "pro" && (!status || status === "active" || status === "trialing" || status === "past_due")) {
    return { 
      canProceed: true, 
      isPro: true,
      tier: "pro",
      status
    };
  }

  // For free tier, check current counts
  const [clientsResult, jobsResult, invoicesResult] = await Promise.all([
    supabase.from("clients").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("jobs").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("invoices").select("id", { count: "exact", head: true }).eq("user_id", user.id),
  ]);

  return {
    canProceed: true,
    isPro: false,
    tier: "free",
    limits: FREE_TIER_LIMITS,
    current: {
      clients: clientsResult.count ?? 0,
      jobs: jobsResult.count ?? 0,
      invoices: invoicesResult.count ?? 0,
    },
  };
}
