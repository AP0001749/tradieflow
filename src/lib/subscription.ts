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
    .select("subscription_tier")
    .eq("user_id", user.id)
    .maybeSingle();

  const tier = (profile as { subscription_tier?: string | null } | null)?.subscription_tier ?? "free";
  
  // Pro users have no limits
  if (tier === "pro") {
    return { 
      canProceed: true, 
      isPro: true,
      tier: "pro"
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

export async function canCreateClient() {
  const result = await checkSubscriptionLimits();
  
  if (!result.canProceed) {
    return { allowed: false, error: result.error };
  }

  if (result.isPro) {
    return { allowed: true };
  }

  const currentClients = result.current?.clients ?? 0;
  const maxClients = result.limits?.maxClients ?? 0;

  if (currentClients >= maxClients) {
    return { 
      allowed: false, 
      error: `Free plan limited to ${maxClients} clients. Upgrade to Pro for unlimited clients.`,
      limit: maxClients,
      current: currentClients
    };
  }

  return { allowed: true };
}

export async function canCreateJob() {
  const result = await checkSubscriptionLimits();
  
  if (!result.canProceed) {
    return { allowed: false, error: result.error };
  }

  if (result.isPro) {
    return { allowed: true };
  }

  const currentJobs = result.current?.jobs ?? 0;
  const maxJobs = result.limits?.maxJobs ?? 0;

  if (currentJobs >= maxJobs) {
    return { 
      allowed: false, 
      error: `Free plan limited to ${maxJobs} jobs. Upgrade to Pro for unlimited jobs.`,
      limit: maxJobs,
      current: currentJobs
    };
  }

  return { allowed: true };
}

export async function canCreateInvoice() {
  const result = await checkSubscriptionLimits();
  
  if (!result.canProceed) {
    return { allowed: false, error: result.error };
  }

  if (result.isPro) {
    return { allowed: true };
  }

  const currentInvoices = result.current?.invoices ?? 0;
  const maxInvoices = result.limits?.maxInvoices ?? 0;

  if (currentInvoices >= maxInvoices) {
    return { 
      allowed: false, 
      error: `Free plan limited to ${maxInvoices} invoices. Upgrade to Pro for unlimited invoices.`,
      limit: maxInvoices,
      current: currentInvoices
    };
  }

  return { allowed: true };
}
