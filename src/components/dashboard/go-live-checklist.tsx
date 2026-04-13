import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  FileText,
  Link2,
  MapPinned,
  Megaphone,
  PhoneCall,
  Star,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ChecklistIcon =
  | "public-link"
  | "service-area"
  | "dispatch-profile"
  | "missed-call"
  | "quote-followup"
  | "review"
  | "outreach"
  | "lead"
  | "job";

type ChecklistItem = {
  id: string;
  title: string;
  description: string;
  href: string;
  actionLabel: string;
  complete: boolean;
  icon: ChecklistIcon;
};

interface GoLiveChecklistProps {
  items: ChecklistItem[];
}

const iconMap = {
  "public-link": Link2,
  "service-area": MapPinned,
  "dispatch-profile": Users,
  "missed-call": PhoneCall,
  "quote-followup": FileText,
  review: Star,
  outreach: Megaphone,
  lead: Users,
  job: Briefcase,
} satisfies Record<ChecklistIcon, typeof Link2>;

function getProgressState(completedCount: number, totalCount: number) {
  if (completedCount === totalCount) {
    return {
      label: "Go-Live Ready",
      description:
        "Core lead capture, follow-up, and operator workflow steps are armed for this workspace.",
      badgeClassName:
        "border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    };
  }

  if (completedCount >= Math.ceil(totalCount * 0.7)) {
    return {
      label: "Recovery Stack Armed",
      description:
        "Most of the Zero-Leak rollout is in place. Finish the remaining action and the workspace is ready to run live.",
      badgeClassName:
        "border-transparent bg-sky-500/15 text-sky-700 dark:bg-sky-500/15 dark:text-sky-200",
    };
  }

  if (completedCount >= Math.ceil(totalCount * 0.35)) {
    return {
      label: "Foundation In Progress",
      description:
        "The workspace has started the rollout, but key lead-recovery systems still need to be armed before full launch.",
      badgeClassName:
        "border-transparent bg-amber-500/15 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200",
    };
  }

  return {
    label: "Setup Starting",
    description:
      "The workspace still needs the core dispatch-audit and automation foundation before leads can be captured reliably.",
    badgeClassName: "border-transparent bg-muted text-muted-foreground",
  };
}

export function GoLiveChecklist({ items }: GoLiveChecklistProps) {
  const completedCount = items.filter((item) => item.complete).length;
  const totalCount = items.length;
  const progressPercent =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const nextItem = items.find((item) => !item.complete) ?? null;
  const progressState = getProgressState(completedCount, totalCount);

  return (
    <section className="section-card space-y-5">
      <div className="section-heading">
        <h2>Go-Live Checklist</h2>
        <p>
          Walk through the rollout in the right order so lead capture, missed-call recovery,
          and the job pipeline are ready before traffic starts landing.
        </p>
      </div>

      <Card className="p-5 space-y-5 border-border/60">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">
                {completedCount} of {totalCount} complete
              </Badge>
              <Badge className={progressState.badgeClassName}>{progressState.label}</Badge>
            </div>
            <div className="space-y-1">
              <p className="text-base font-semibold">
                {nextItem
                  ? `Next recommended action: ${nextItem.title}`
                  : "All core rollout actions are complete."}
              </p>
              <p className="text-sm text-muted-foreground">{progressState.description}</p>
            </div>
          </div>

          <Link
            href={nextItem?.href || "/dashboard/leads"}
            className={cn(buttonVariants({ variant: nextItem ? "default" : "outline" }), "w-full sm:w-auto")}
          >
            {nextItem?.actionLabel || "Review Leads"}
          </Link>
        </div>

        <div className="space-y-2">
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-500 via-cyan-500 to-emerald-500 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Rollout progress: {progressPercent}% complete
          </p>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => {
          const Icon = iconMap[item.icon];

          return (
            <Card key={item.id} className="p-5 space-y-4 border-border/60">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "rounded-xl p-2.5",
                      item.complete
                        ? "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-semibold leading-tight">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                </div>

                {item.complete ? (
                  <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-emerald-500" />
                ) : (
                  <Badge variant="outline">Next up</Badge>
                )}
              </div>

              <Link
                href={item.href}
                className="inline-flex items-center gap-2 text-sm font-medium text-primary transition-colors hover:text-primary/80"
              >
                {item.actionLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
