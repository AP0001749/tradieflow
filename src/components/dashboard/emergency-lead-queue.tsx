import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LeadResponseActions } from "@/components/dashboard/lead-response-actions";
import {
  compareLeadResponsePriority,
  formatLeadResponseDueAt,
  getLeadResponseSlaClassName,
  getLeadResponseSlaLabel,
  getLeadResponseSlaState,
  getLeadUrgencyBadgeClassName,
  getLeadUrgencyLabel,
  isLeadResponseOverdue,
} from "@/lib/lead-triage";
import { cn } from "@/lib/utils";

type EmergencyLeadQueueLead = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  suburb: string | null;
  postcode: string | null;
  job_type: string | null;
  lead_urgency: string | null;
  response_due_at: string | null;
  triage_problem: string | null;
  triage_safety_risk: boolean | null;
  status: string | null;
  first_responded_at?: string | null;
  last_contacted_at?: string | null;
  created_at: string | null;
};

interface EmergencyLeadQueueProps {
  leads: EmergencyLeadQueueLead[];
  maxItems?: number;
}

export function EmergencyLeadQueue({
  leads,
  maxItems = 6,
}: EmergencyLeadQueueProps) {
  const sortedLeads = [...leads]
    .sort(compareLeadResponsePriority)
    .slice(0, maxItems);
  const overdueCount = leads.filter((lead) =>
    isLeadResponseOverdue(lead.response_due_at, lead.status),
  ).length;
  const emergencyCount = leads.filter(
    (lead) => lead.lead_urgency === "emergency",
  ).length;

  return (
    <section className="section-card space-y-5">
      <div className="section-heading">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-primary" />
          <h2>Emergency Lead Queue</h2>
        </div>
        <p>
          Response-risk leads sorted by urgency and SLA so missed HVAC, plumbing,
          and electrical requests stay visible from the first dashboard screen.
        </p>
      </div>

      <Card className="space-y-4 border-border/60 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={overdueCount > 0 ? "destructive" : "outline"}>
              Overdue {overdueCount}
            </Badge>
            <Badge
              className={
                emergencyCount > 0
                  ? "border-transparent bg-rose-500/15 text-rose-700 dark:text-rose-200"
                  : undefined
              }
              variant={emergencyCount > 0 ? undefined : "outline"}
            >
              Emergency {emergencyCount}
            </Badge>
          </div>

          <Link
            href="/dashboard/leads"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Open Lead Inbox
          </Link>
        </div>

        {sortedLeads.length > 0 ? (
          <div className="space-y-3">
            {sortedLeads.map((lead) => {
              const overdue = isLeadResponseOverdue(
                lead.response_due_at,
                lead.status,
              );
              const slaState = getLeadResponseSlaState({
                firstRespondedAt: lead.first_responded_at,
                lastContactedAt: lead.last_contacted_at,
                responseDueAt: lead.response_due_at,
                status: lead.status,
              });

              return (
                <div
                  key={lead.id}
                  className="rounded-xl border border-border/70 bg-background/70 p-4"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={getLeadUrgencyBadgeClassName(lead.lead_urgency)}>
                          {getLeadUrgencyLabel(lead.lead_urgency)}
                        </Badge>
                        <Badge className={getLeadResponseSlaClassName(slaState)}>
                          {getLeadResponseSlaLabel(slaState)}
                        </Badge>
                        {overdue ? <Badge variant="destructive">SLA overdue</Badge> : null}
                        {lead.triage_safety_risk ? (
                          <Badge className="border-transparent bg-rose-500/15 text-rose-700 dark:text-rose-200">
                            Safety risk
                          </Badge>
                        ) : null}
                      </div>

                      <div>
                        <Link
                          href={`/dashboard/leads/${lead.id}`}
                          className="font-medium transition-colors hover:text-foreground hover:underline"
                        >
                          {lead.name}
                        </Link>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {lead.job_type?.replaceAll("_", " ") || "General enquiry"}
                          {lead.suburb ? ` in ${lead.suburb}` : ""}
                          {lead.postcode ? ` ${lead.postcode}` : ""}
                        </p>
                        <p
                          className={cn(
                            "mt-1 text-xs",
                            overdue ? "text-destructive" : "text-muted-foreground",
                          )}
                        >
                          Response target {formatLeadResponseDueAt(lead.response_due_at)}
                        </p>
                      </div>

                      {lead.triage_problem ? (
                        <p className="line-clamp-2 text-sm text-muted-foreground">
                          {lead.triage_problem}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <LeadResponseActions lead={lead} align="end" />
                      <Link
                        href={`/dashboard/leads/${lead.id}`}
                        className={buttonVariants({ variant: "ghost", size: "sm" })}
                      >
                        Open
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border/70 bg-muted/30 px-4 py-5 text-sm text-muted-foreground">
            No active emergency triage leads right now.
          </div>
        )}
      </Card>
    </section>
  );
}
