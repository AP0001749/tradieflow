export type PlanKey = "baseline" | "apex";
export type SubscriptionPlanKey = "free" | PlanKey;

const ACTIVE_PAID_SUBSCRIPTION_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
]);

export interface PricingPlan {
  key: PlanKey;
  name: string;
  priceAud: number;
  blurb: string;
  cta: string;
  features: string[];
}

const PRICING_PLANS: Record<PlanKey, PricingPlan> = {
  baseline: {
    key: "baseline",
    name: "Baseline",
    priceAud: 299,
    blurb: "Recover missed-call revenue before it leaks to the next tradie on Google.",
    cta: "Start Baseline",
    features: [
      "Missed-call text back",
      "Standard SMS routing",
      "Lead capture workspace",
      "Jobs, invoices, and client management",
    ],
  },
  apex: {
    key: "apex",
    name: "Apex",
    priceAud: 499,
    blurb: "Add quote follow-up, review extraction, and deeper operational automation.",
    cta: "Start Apex",
    features: [
      "Everything in Baseline",
      "48-hour quote nurture SMS",
      "Post-payment Google review extractor",
      "Priority onboarding for deeper CRM wiring",
    ],
  },
};

export function normalizePlanKey(value: unknown): PlanKey {
  return value === "apex" ? "apex" : "baseline";
}

export function parsePlanKey(value: unknown): PlanKey | null {
  if (value === "baseline" || value === "apex") {
    return value;
  }

  return null;
}

export function normalizeSubscriptionPlanKey(value: unknown): SubscriptionPlanKey {
  if (value === "baseline" || value === "apex") {
    return value;
  }

  return "free";
}

export function getSubscriptionPlanLabel(planKey: SubscriptionPlanKey): string {
  if (planKey === "baseline") {
    return "Baseline";
  }

  if (planKey === "apex") {
    return "Apex";
  }

  return "Free";
}

export function hasApexAutomationAccess(planKey: SubscriptionPlanKey) {
  return planKey === "apex";
}

export function hasBaselineAutomationAccess(planKey: SubscriptionPlanKey) {
  return planKey === "baseline" || planKey === "apex";
}

export function getEffectiveSubscriptionPlanKey({
  subscriptionPlanKey,
  subscriptionTier,
  subscriptionStatus,
}: {
  subscriptionPlanKey?: unknown;
  subscriptionTier?: unknown;
  subscriptionStatus?: unknown;
}): SubscriptionPlanKey {
  const normalizedPlanKey = parsePlanKey(subscriptionPlanKey);
  const normalizedTier =
    typeof subscriptionTier === "string" ? subscriptionTier.trim().toLowerCase() : "";
  const normalizedStatus =
    typeof subscriptionStatus === "string"
      ? subscriptionStatus.trim().toLowerCase() || "active"
      : "active";
  const hasPaidMarker = Boolean(normalizedPlanKey) || normalizedTier === "pro";

  if (!hasPaidMarker || !ACTIVE_PAID_SUBSCRIPTION_STATUSES.has(normalizedStatus)) {
    return "free";
  }

  return normalizedPlanKey ?? "baseline";
}

export function getPricingPlan(planKey: PlanKey): PricingPlan {
  return PRICING_PLANS[planKey];
}

export function getPricingPlans(): PricingPlan[] {
  return [PRICING_PLANS.baseline, PRICING_PLANS.apex];
}

export function getPlanValue(planKey: PlanKey | null | undefined): number {
  return getPricingPlan(normalizePlanKey(planKey)).priceAud;
}

export function getPlanPriceId(planKey: PlanKey): string | null {
  if (planKey === "apex") {
    return process.env.NEXT_PUBLIC_STRIPE_APEX_PRICE_ID?.trim() || null;
  }

  return (
    process.env.NEXT_PUBLIC_STRIPE_BASELINE_PRICE_ID?.trim() ||
    process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID?.trim() ||
    null
  );
}

export function getPlanKeyForPriceId(priceId: string | null | undefined): PlanKey | null {
  const normalizedPriceId = priceId?.trim();

  if (!normalizedPriceId) {
    return null;
  }

  const apexPriceId = process.env.NEXT_PUBLIC_STRIPE_APEX_PRICE_ID?.trim();
  const baselinePriceId = process.env.NEXT_PUBLIC_STRIPE_BASELINE_PRICE_ID?.trim();
  const legacyPriceId = process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID?.trim();

  if (apexPriceId && normalizedPriceId === apexPriceId) {
    return "apex";
  }

  if (
    (baselinePriceId && normalizedPriceId === baselinePriceId) ||
    (legacyPriceId && normalizedPriceId === legacyPriceId)
  ) {
    return "baseline";
  }

  return null;
}
