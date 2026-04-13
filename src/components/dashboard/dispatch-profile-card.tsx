import Link from "next/link";
import { ArrowRight, Clock3, MapPinned, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  countDispatchProfileFields,
  getDispatchProfileValue,
  hasDispatchProfile,
} from "@/lib/dispatch-profile";
import { getDispatchRosterPreview } from "@/lib/dispatch-roster";
import { getTradeFocusLabel } from "@/lib/trade-focus";
import { cn } from "@/lib/utils";

interface DispatchProfileCardProps {
  primaryTradeFocus?: string | null;
  teamSize?: string | null;
  afterHoursCoverage?: string | null;
  dispatchRadius?: string | null;
  dispatchRoster?: string[] | null;
  serviceAreaCount: number;
  defaultJobTypeCount: number;
}

function SnapshotRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border/70 bg-background/70 p-3">
      <div className="rounded-lg bg-muted p-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

export function DispatchProfileCard({
  primaryTradeFocus,
  teamSize,
  afterHoursCoverage,
  dispatchRadius,
  dispatchRoster,
  serviceAreaCount,
  defaultJobTypeCount,
}: DispatchProfileCardProps) {
  const dispatchProfileReady = hasDispatchProfile({
    team_size: teamSize,
    after_hours_coverage: afterHoursCoverage,
    dispatch_radius: dispatchRadius,
  });
  const dispatchProfileCount = countDispatchProfileFields({
    team_size: teamSize,
    after_hours_coverage: afterHoursCoverage,
    dispatch_radius: dispatchRadius,
  });
  const rosterPreview = getDispatchRosterPreview(dispatchRoster, 4);
  const coverageReady = serviceAreaCount > 0 && defaultJobTypeCount > 0;

  return (
    <section className="section-card space-y-5">
      <div className="section-heading">
        <h2>Dispatch Profile</h2>
        <p>
          Capture how the team actually covers work so the funnel, routing, and
          onboarding stay aligned with real operating conditions.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="space-y-4 border-border/60 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold">Operating Model</h3>
                {dispatchProfileReady ? (
                  <Badge className="border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                    Ready
                  </Badge>
                ) : (
                  <Badge variant="outline">{dispatchProfileCount} / 3 set</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Team size, after-hours coverage, and dispatch radius are used as the
                operating baseline for rollout decisions.
              </p>
            </div>

            <Link
              href="/dashboard/settings"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "shrink-0")}
            >
              Edit Profile
            </Link>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <SnapshotRow
              icon={Users}
              label="Team Size"
              value={getDispatchProfileValue(teamSize)}
            />
            <SnapshotRow
              icon={Clock3}
              label="After-Hours"
              value={getDispatchProfileValue(afterHoursCoverage)}
            />
            <SnapshotRow
              icon={MapPinned}
              label="Dispatch Radius"
              value={getDispatchProfileValue(dispatchRadius)}
            />
          </div>
        </Card>

        <Card className="space-y-4 border-border/60 p-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold">Coverage Blueprint</h3>
              {coverageReady ? (
                <Badge className="border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                  Configured
                </Badge>
              ) : (
                <Badge variant="outline">Needs input</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              This keeps the public lead flow honest about where the team works and what
              kinds of urgent jobs belong in the pipeline.
            </p>
          </div>

          <div className="space-y-3">
            <div className="rounded-xl border border-border/70 bg-background/70 p-3">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Primary Trade Focus
              </p>
              <p className="mt-1 text-sm font-medium">
                {getTradeFocusLabel(primaryTradeFocus)}
              </p>
            </div>

            <div className="rounded-xl border border-border/70 bg-background/70 p-3">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Service Areas
              </p>
              <p className="mt-1 text-sm font-medium">
                {serviceAreaCount > 0
                  ? `${serviceAreaCount} postcode${serviceAreaCount === 1 ? "" : "s"} configured`
                  : "No service areas configured yet"}
              </p>
            </div>

            <div className="rounded-xl border border-border/70 bg-background/70 p-3">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Default Job Types
              </p>
              <p className="mt-1 text-sm font-medium">
                {defaultJobTypeCount > 0
                  ? `${defaultJobTypeCount} job type${defaultJobTypeCount === 1 ? "" : "s"} configured`
                  : "No default job types configured yet"}
              </p>
            </div>

            <div className="rounded-xl border border-border/70 bg-background/70 p-3">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Dispatch Roster
              </p>
              <p className="mt-1 text-sm font-medium">
                {dispatchRoster && dispatchRoster.length > 0
                  ? `${dispatchRoster.length} crew preset${dispatchRoster.length === 1 ? "" : "s"} saved`
                  : "No crew presets saved yet"}
              </p>
              {rosterPreview.length > 0 ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {rosterPreview.join(" | ")}
                </p>
              ) : null}
            </div>
          </div>

          <Link
            href="/dashboard/settings"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary transition-colors hover:text-primary/80"
          >
            Review settings
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Card>
      </div>
    </section>
  );
}
