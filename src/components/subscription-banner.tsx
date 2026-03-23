"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { checkSubscriptionLimits } from "@/lib/subscription";

interface SubscriptionStatus {
  canProceed: boolean;
  isPro: boolean;
  tier?: string;
  status?: string | null;
  error?: string;
  limits?: { maxClients: number; maxJobs: number; maxInvoices: number };
  current?: { clients: number; jobs: number; invoices: number };
}

interface SubscriptionBannerProps {
  resourceType: "clients" | "jobs" | "invoices";
}

export function SubscriptionBanner({ resourceType }: SubscriptionBannerProps) {
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStatus() {
      try {
        const result = await checkSubscriptionLimits();
        setStatus(result);
      } catch {
        // Silently fail - banner is non-critical UI
      } finally {
        setLoading(false);
      }
    }
    fetchStatus();
  }, []);

  if (loading || !status || status.isPro) {
    return null;
  }

  const current = status.current?.[resourceType] ?? 0;
  const limitKey = `max${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)}` as keyof NonNullable<SubscriptionStatus["limits"]>;
  const limit = status.limits?.[limitKey] ?? 0;
  const percentage = limit > 0 ? (current / limit) * 100 : 0;

  // Only show when approaching or at limit
  if (percentage < 60) {
    return null;
  }

  const isAtLimit = current >= limit;

  return (
    <div
      className={`rounded-xl p-4 border animate-in fade-in slide-in-from-top-2 duration-500 ${
        isAtLimit
          ? "bg-gradient-to-br from-rose-500/10 to-rose-500/5 border-rose-500/30"
          : "bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/30"
      }`}
    >
      <div className="flex items-start gap-3">
        <AlertCircle
          className={`h-5 w-5 mt-0.5 ${
            isAtLimit ? "text-rose-600 dark:text-rose-400" : "text-amber-600 dark:text-amber-400"
          }`}
        />
        <div className="flex-1">
          <h3
            className={`font-semibold ${
              isAtLimit ? "text-rose-800 dark:text-rose-300" : "text-amber-800 dark:text-amber-300"
            }`}
          >
            {isAtLimit ? "Limit Reached" : "Approaching Limit"}
          </h3>
          <p
            className={`text-sm mt-1 ${
              isAtLimit ? "text-rose-700 dark:text-rose-300/90" : "text-amber-700 dark:text-amber-300/90"
            }`}
          >
            {isAtLimit
              ? `You've reached the free plan limit of ${limit} ${resourceType}. `
              : `You're using ${current} of ${limit} ${resourceType} on the free plan. `}
            Upgrade to Pro for unlimited access.
          </p>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex-1 h-2 bg-background/50 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  isAtLimit
                    ? "bg-gradient-to-r from-rose-500 to-rose-400"
                    : "bg-gradient-to-r from-amber-500 to-amber-400"
                }`}
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>
            <span className="text-xs font-medium tabular-nums">
              {current}/{limit}
            </span>
          </div>
        </div>
        <Link href="/dashboard/billing">
          <Button size="sm" className="gap-2 shrink-0">
            <Sparkles className="w-4 h-4" />
            Upgrade
          </Button>
        </Link>
      </div>
    </div>
  );
}
