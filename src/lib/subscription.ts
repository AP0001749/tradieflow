"use server";

import { createClient } from "@/lib/supabase/server";
import type { SubscriptionStatus, TierLimits } from "@/lib/subscription-limits";

type TierLimitRow = {
  tier: string;
  max_clients: number | null;
  max_jobs: number | null;
  max_invoices: number | null;
  unlimited: boolean | null;
};

const ACTIVE_PRO_STATUSES = new Set(["active", "trialing", "past_due"]);
const LEGACY_TIER_LIMITS: Record<string, TierLimits> = {
  free: {
    tier: "free",
    maxClients: 3,
    maxJobs: 5,
    maxInvoices: 10,
    unlimited: false,
  },
  pro: {
    tier: "pro",
    maxClients: null,
    maxJobs: null,
    maxInvoices: null,
    unlimited: true,
  },
};

function normalizeTierLimits(row: TierLimitRow): TierLimits {
  return {
    tier: row.tier,
    maxClients: row.max_clients,
    maxJobs: row.max_jobs,
    maxInvoices: row.max_invoices,
    unlimited: Boolean(row.unlimited),
  };
}

async function getTierLimitsForTier(tier: string): Promise<TierLimits | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_tier_limits", {
    p_tier: tier,
  });

  if (error) {
    console.error("Error fetching tier limits:", error);
    return LEGACY_TIER_LIMITS[tier] ?? null;
  }

  const row = ((data as TierLimitRow[] | null) || [])[0] ?? null;
  return row ? normalizeTierLimits(row) : (LEGACY_TIER_LIMITS[tier] ?? null);
}

export async function checkSubscriptionLimits(): Promise<SubscriptionStatus> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      canProceed: false,
      error: "Unauthorized",
      isPro: false,
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

  const hasUnlimitedProAccess = tier === "pro" && (!status || ACTIVE_PRO_STATUSES.has(status));
  const effectiveTier = hasUnlimitedProAccess ? "pro" : "free";
  const limits = await getTierLimitsForTier(effectiveTier);

  if (!limits && !hasUnlimitedProAccess) {
    return {
      canProceed: false,
      isPro: false,
      tier: effectiveTier,
      status,
      error: "Could not load plan limits",
    };
  }

  if (hasUnlimitedProAccess) {
    return {
      canProceed: true,
      isPro: true,
      tier: "pro",
      status,
      limits: limits ?? undefined,
    };
  }

  // For free tier, check current counts
  const [clientsResult, jobsResult, invoicesResult] = await Promise.all([
    supabase.from("clients").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("jobs").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("invoices").select("id", { count: "exact", head: true }).eq("user_id", user.id),
  ]);

  const countError =
    clientsResult.error || jobsResult.error || invoicesResult.error;

  if (countError) {
    console.error("Error fetching subscription usage:", countError);
    return {
      canProceed: false,
      isPro: false,
      tier: "free",
      status,
      limits: limits ?? undefined,
      error: "Could not load current usage",
    };
  }

  return {
    canProceed: true,
    isPro: false,
    tier: "free",
    status,
    limits: limits ?? undefined,
    current: {
      clients: clientsResult.count ?? 0,
      jobs: jobsResult.count ?? 0,
      invoices: invoicesResult.count ?? 0,
    },
  };
}
