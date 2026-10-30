"use client";

import { useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { PlanKey } from "@/lib/pricing";

interface SubscribeButtonProps {
  planKey: PlanKey;
  label?: string;
  disabled?: boolean;
}

export function SubscribeButton({
  planKey,
  label = "Upgrade Now",
  disabled = false,
}: SubscribeButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubscribe() {
    if (disabled) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planKey }),
      });

      const data = (await res.json()) as {
        sessionId?: string | null;
        url?: string | null;
        mode?: "checkout" | "portal";
        error?: string;
      };

      if (!res.ok) {
        throw new Error(data.error || "Failed to start checkout");
      }

      if (!data.url) {
        throw new Error(
          data.mode === "portal"
            ? "Billing portal URL missing"
            : "Checkout URL missing"
        );
      }

      // Portal redirects intentionally omit sessionId; checkout includes one.
      if (data.mode !== "portal" && !data.sessionId) {
        throw new Error(data.error || "Failed to start checkout");
      }

      window.location.assign(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button onClick={handleSubscribe} disabled={loading || disabled} className="w-full">
        {loading ? "Redirecting..." : label}
      </Button>

      <p className="text-xs text-muted-foreground">
        By upgrading, you agree to our{" "}
        <Link href="/legal/terms" className="underline underline-offset-4">
          Terms
        </Link>
        {" "}and{" "}
        <Link href="/legal/privacy" className="underline underline-offset-4">
          Privacy Policy
        </Link>
        .
      </p>
      {error ? <div className="text-sm text-red-600">{error}</div> : null}
    </div>
  );
}
