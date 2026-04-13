"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertCircle, Check, Copy, ExternalLink, Route } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import type { DispatchRoutePack } from "@/lib/dispatch-route";
import { cn } from "@/lib/utils";

interface DispatchRoutePlannerProps {
  routeReadyCount: number;
  missingAddressCount: number;
  routePacks: DispatchRoutePack[];
  selectedCrew?: string;
  selectedDate: string;
}

function formatRouteDate(value: string) {
  const parsed = new Date(`${value}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function DispatchRoutePlanner({
  routeReadyCount,
  missingAddressCount,
  routePacks,
  selectedCrew,
  selectedDate,
}: DispatchRoutePlannerProps) {
  const [copiedPackId, setCopiedPackId] = useState<string | null>(null);
  const crewLabel = selectedCrew?.trim() ? selectedCrew : "All crews";
  const dateLabel = formatRouteDate(selectedDate);

  async function handleCopy(pack: DispatchRoutePack) {
    try {
      await navigator.clipboard.writeText(pack.copyText);
      setCopiedPackId(pack.id);
      window.setTimeout(() => setCopiedPackId((current) => (current === pack.id ? null : current)), 1600);
    } catch {
      setCopiedPackId(null);
    }
  }

  return (
    <Card data-print-hidden="true">
      <CardHeader className="space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <CardTitle>Dispatch Route Pack</CardTitle>
            <p className="text-sm text-muted-foreground">
              Build map-ready stop packs for {crewLabel.toLowerCase()} on {dateLabel}.
              This gives dispatch a usable route handoff before live GPS lands.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="rounded-full border border-border/70 bg-muted/40 px-3 py-1">
              {routeReadyCount} route-ready stop{routeReadyCount === 1 ? "" : "s"}
            </span>
            <span className="rounded-full border border-border/70 bg-muted/40 px-3 py-1">
              {missingAddressCount} missing address{missingAddressCount === 1 ? "" : "es"}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {routePacks.length > 0 ? (
          <div className="space-y-4">
            {routePacks.map((pack) => (
              <div
                key={pack.id}
                className="rounded-xl border border-border/70 bg-background/70 p-4"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Route className="h-4 w-4 text-primary" />
                      <span>{pack.label}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {pack.stops.length} stop{pack.stops.length === 1 ? "" : "s"} in this route pack.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <a
                      href={pack.mapUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={cn(buttonVariants({ size: "sm" }))}
                    >
                      <ExternalLink className="h-4 w-4" />
                      Open in Google Maps
                    </a>
                    <button
                      type="button"
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                      onClick={() => handleCopy(pack)}
                    >
                      {copiedPackId === pack.id ? (
                        <>
                          <Check className="h-4 w-4" />
                          Copied Stops
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          Copy Stops
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {pack.stops.map((stop, index) => (
                    <div
                      key={stop.id}
                      className="flex flex-col gap-2 rounded-lg border border-border/60 bg-card p-3 lg:flex-row lg:items-center lg:justify-between"
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-medium">
                          {index + 1}. {stop.title}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {stop.clientName || "Client not linked"} | {stop.address}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Run order: {stop.dispatchSequence ? `#${stop.dispatchSequence}` : "Auto"}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={stop.href}
                          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                        >
                          Open Job
                        </Link>
                        <a
                          href={stop.mapUrl}
                          target="_blank"
                          rel="noreferrer"
                          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                        >
                          Map Stop
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
            No route pack is ready yet for this filter. Add client addresses to scheduled
            jobs and they will appear here automatically.
          </div>
        )}

        {missingAddressCount > 0 ? (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                {missingAddressCount} active job{missingAddressCount === 1 ? "" : "s"} still
                need a client address before they can join a route pack.
              </p>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
