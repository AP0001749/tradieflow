"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

export function SubscribeButton({
  priceId,
  userId,
}: {
  priceId: string;
  userId: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubscribe() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId, userId }),
      });

      const data = (await res.json()) as {
        sessionId?: string;
        url?: string | null;
        error?: string;
      };

      if (!res.ok || !data.sessionId) {
        throw new Error(data.error || "Failed to start checkout");
      }

      if (!data.url) {
        throw new Error("Checkout URL missing");
      }

      window.location.assign(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button onClick={handleSubscribe} disabled={loading} className="w-full">
        {loading ? "Redirecting…" : "Upgrade Now"}
      </Button>
      {error ? <div className="text-sm text-red-600">{error}</div> : null}
    </div>
  );
}
