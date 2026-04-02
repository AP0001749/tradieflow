export type ResourceType = "clients" | "jobs" | "invoices";

export interface TierLimits {
  tier: string;
  maxClients: number | null;
  maxJobs: number | null;
  maxInvoices: number | null;
  unlimited: boolean;
}

export interface SubscriptionStatus {
  canProceed: boolean;
  isPro: boolean;
  tier?: string;
  planKey?: string;
  status?: string | null;
  error?: string;
  limits?: TierLimits;
  current?: { clients: number; jobs: number; invoices: number };
}

export function getResourceLimit(
  limits: TierLimits | undefined,
  resourceType: ResourceType,
): number | null {
  if (!limits) return null;
  if (resourceType === "clients") return limits.maxClients;
  if (resourceType === "jobs") return limits.maxJobs;
  return limits.maxInvoices;
}

export function getLimitReachedMessage(resourceType: ResourceType, limit: number) {
  return `Free plan limited to ${limit} ${resourceType}. Upgrade to Baseline for unlimited ${resourceType}.`;
}
