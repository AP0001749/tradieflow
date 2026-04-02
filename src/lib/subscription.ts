"use server";

import {
  getEffectiveSubscriptionPlanKey,
  type SubscriptionPlanKey,
} from "@/lib/pricing";
import { createClient } from "@/lib/supabase/server";
import type { SubscriptionStatus, TierLimits } from "@/lib/subscription-limits";

type TierLimitRow = {
  tier: string;
  max_clients: number | null;
  max_jobs: number | null;
  max_invoices: number | null;
  unlimited: boolean | null;
};

const LEGACY_TIER_LIMITS: Record<string, TierLimits> = {
  free: {
    tier: "free",
    maxClients: 3,
    maxJobs: 5,
    maxInvoices: 10,
    unlimited: false,
  },
  baseline: {
    tier: "baseline",
    maxClients: null,
    maxJobs: null,
    maxInvoices: null,
    unlimited: true,
  },
  apex: {
    tier: "apex",
    maxClients: null,
    maxJobs: null,
    maxInvoices: null,
    unlimited: true,
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

function getPaidStatusResult(
  planKey: SubscriptionPlanKey,
  status: string | null,
  limits: TierLimits | null,
): SubscriptionStatus {
  return {
    canProceed: true,
    isPro: true,
    tier: planKey,
    planKey,
    status,
    limits: limits ?? undefined,
  };
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
      planKey: "free",
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier, subscription_plan_key, subscription_status")
    .eq("user_id", user.id)
    .maybeSingle();

  const typedProfile = profile as {
    subscription_tier?: string | null;
    subscription_plan_key?: string | null;
    subscription_status?: string | null;
  } | null;
  const status = typedProfile?.subscription_status ?? null;
  const effectivePlanKey = getEffectiveSubscriptionPlanKey({
    subscriptionPlanKey: typedProfile?.subscription_plan_key,
    subscriptionTier: typedProfile?.subscription_tier,
    subscriptionStatus: status,
  });
  const isPaidPlan = effectivePlanKey !== "free";
  const limits = await getTierLimitsForTier(effectivePlanKey);

  if (!limits && !isPaidPlan) {
    return {
      canProceed: false,
      isPro: false,
      tier: "free",
      planKey: "free",
      status,
      error: "Could not load plan limits",
    };
  }

  if (isPaidPlan) {
    return getPaidStatusResult(effectivePlanKey, status, limits);
  }

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
      planKey: "free",
      status,
      limits: limits ?? undefined,
      error: "Could not load current usage",
    };
  }

  return {
    canProceed: true,
    isPro: false,
    tier: "free",
    planKey: "free",
    status,
    limits: limits ?? undefined,
    current: {
      clients: clientsResult.count ?? 0,
      jobs: jobsResult.count ?? 0,
      invoices: invoicesResult.count ?? 0,
    },
  };
}
