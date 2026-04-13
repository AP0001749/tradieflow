import { Clock3, Target, TimerReset, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  LeadResponseSlaState,
  getLeadResponseSlaClassName,
  getLeadResponseSlaLabel,
  getLeadResponseSlaState,
} from "@/lib/lead-triage";

type LeadResponseSlaSummaryLead = {
  created_at: string | null;
  first_responded_at?: string | null;
  last_contacted_at?: string | null;
  response_due_at: string | null;
  status: string | null;
};

type SummaryCardProps = {
  title: string;
  value: string | number;
  description: string;
  icon: typeof Clock3;
  badge?: {
    label: string;
    className?: string;
  };
};

interface LeadResponseSlaSummaryProps {
  leads: LeadResponseSlaSummaryLead[];
}

const SLA_STATES: LeadResponseSlaState[] = [
  "pending",
  "overdue",
  "hit",
  "missed",
  "closed_unanswered",
  "untracked",
];

function SummaryCard({
  title,
  value,
  description,
  icon: Icon,
  badge,
}: SummaryCardProps) {
  return (
    <Card className="space-y-4 border-border/60 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-semibold tracking-tight">{value}</p>
        </div>
        <div className="rounded-lg bg-primary/10 p-2 text-primary">
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <p className="text-sm text-muted-foreground">{description}</p>

      {badge ? (
        <Badge className={badge.className || undefined} variant={badge.className ? undefined : "outline"}>
          {badge.label}
        </Badge>
      ) : null}
    </Card>
  );
}

function getFirstResponseMinutes(lead: LeadResponseSlaSummaryLead) {
  const responseAt = lead.first_responded_at || lead.last_contacted_at;

  if (!lead.created_at || !responseAt) {
    return null;
  }

  const createdAtMs = new Date(lead.created_at).getTime();
  const responseAtMs = new Date(responseAt).getTime();

  if (Number.isNaN(createdAtMs) || Number.isNaN(responseAtMs)) {
    return null;
  }

  return Math.max(Math.round((responseAtMs - createdAtMs) / 60000), 0);
}

function formatMinutes(value: number | null) {
  if (value === null) {
    return "--";
  }

  if (value >= 1440) {
    return `${(value / 1440).toFixed(1)}d`;
  }

  if (value >= 60) {
    return `${(value / 60).toFixed(1)}h`;
  }

  return `${value}m`;
}

export function LeadResponseSlaSummary({ leads }: LeadResponseSlaSummaryProps) {
  const stateCounts = new Map<LeadResponseSlaState, number>(
    SLA_STATES.map((state) => [state, 0]),
  );
  const responseMinutes = leads
    .map(getFirstResponseMinutes)
    .filter((value): value is number => typeof value === "number");

  for (const lead of leads) {
    const state = getLeadResponseSlaState({
      firstRespondedAt: lead.first_responded_at,
      lastContactedAt: lead.last_contacted_at,
      responseDueAt: lead.response_due_at,
      status: lead.status,
    });

    stateCounts.set(state, (stateCounts.get(state) || 0) + 1);
  }

  const hitCount = stateCounts.get("hit") || 0;
  const missedCount = stateCounts.get("missed") || 0;
  const overdueCount = stateCounts.get("overdue") || 0;
  const pendingCount = stateCounts.get("pending") || 0;
  const scoredCount = hitCount + missedCount;
  const hitRate = scoredCount > 0 ? Math.round((hitCount / scoredCount) * 100) : null;
  const averageResponseMinutes =
    responseMinutes.length > 0
      ? Math.round(
          responseMinutes.reduce((sum, value) => sum + value, 0) /
            responseMinutes.length,
        )
      : null;

  return (
    <section className="section-card space-y-5">
      <div className="section-heading">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          <h2>Response SLA Performance</h2>
        </div>
        <p>
          Measures the first response against each lead&apos;s urgency target so the
          Zero-Leak inbox shows whether emergency capture is actually being worked.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Open Response Risk"
          value={overdueCount}
          description={`${pendingCount} active lead${pendingCount === 1 ? "" : "s"} still inside SLA.`}
          icon={TimerReset}
          badge={{
            label: getLeadResponseSlaLabel(overdueCount > 0 ? "overdue" : "pending"),
            className: getLeadResponseSlaClassName(
              overdueCount > 0 ? "overdue" : "pending",
            ),
          }}
        />

        <SummaryCard
          title="SLA Hit Rate"
          value={hitRate === null ? "--" : `${hitRate}%`}
          description={`${hitCount} hit / ${missedCount} missed first-response targets.`}
          icon={TrendingUp}
          badge={{
            label: scoredCount > 0 ? `${scoredCount} scored` : "No scored responses",
          }}
        />

        <SummaryCard
          title="Average First Response"
          value={formatMinutes(averageResponseMinutes)}
          description={`${responseMinutes.length} lead${responseMinutes.length === 1 ? "" : "s"} have a first response timestamp.`}
          icon={Clock3}
        />

        <SummaryCard
          title="Untracked / Closed"
          value={
            (stateCounts.get("untracked") || 0) +
            (stateCounts.get("closed_unanswered") || 0)
          }
          description="Leads without a response SLA or closed before a first response was recorded."
          icon={Target}
          badge={{
            label: `${stateCounts.get("closed_unanswered") || 0} closed unanswered`,
            className: getLeadResponseSlaClassName("closed_unanswered"),
          }}
        />
      </div>
    </section>
  );
}
