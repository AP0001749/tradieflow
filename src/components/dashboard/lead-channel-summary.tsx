import { MessageSquareReply, PhoneCall, Send, ShieldOff } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type LeadChannelSummaryLead = {
  source: string | null;
  sms_do_not_contact: boolean;
  sms_last_inbound_at: string | null;
  latest_missed_call_textback?: {
    status: string;
  } | null;
};

interface LeadChannelSummaryProps {
  leads: LeadChannelSummaryLead[];
}

function SummaryCard({
  title,
  value,
  description,
  icon: Icon,
  badges,
}: {
  title: string;
  value: number;
  description: string;
  icon: typeof PhoneCall;
  badges?: Array<{
    label: string;
    value: number;
    className?: string;
  }>;
}) {
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

      <div className="flex min-h-6 flex-wrap gap-2">
        {badges && badges.length > 0 ? (
          badges.map((badge) => (
            <Badge
              key={badge.label}
              variant="outline"
              className={badge.className}
            >
              {badge.label} {badge.value}
            </Badge>
          ))
        ) : (
          <Badge variant="outline">No exceptions</Badge>
        )}
      </div>
    </Card>
  );
}

export function LeadChannelSummary({ leads }: LeadChannelSummaryProps) {
  const missedCallLeads = leads.filter(
    (lead) => lead.source === "missed_call_text_back",
  ).length;
  const smsReplies = leads.filter((lead) => Boolean(lead.sms_last_inbound_at)).length;
  const optedOutLeads = leads.filter((lead) => lead.sms_do_not_contact).length;
  const textBackSent = leads.filter(
    (lead) => lead.latest_missed_call_textback?.status === "sent",
  ).length;
  const textBackFailed = leads.filter(
    (lead) => lead.latest_missed_call_textback?.status === "failed",
  ).length;
  const textBackSuppressed = leads.filter(
    (lead) => lead.latest_missed_call_textback?.status === "suppressed",
  ).length;
  const textBackProcessing = leads.filter(
    (lead) => lead.latest_missed_call_textback?.status === "processing",
  ).length;
  const textBackQueued = leads.filter(
    (lead) =>
      lead.source === "missed_call_text_back" && !lead.latest_missed_call_textback,
  ).length;

  return (
    <section className="section-card space-y-5">
      <div className="section-heading">
        <h2>Lead Channel Summary</h2>
        <p>
          Live signal across missed-call capture, text-back delivery, inbound
          SMS replies, and automation-safe opt-outs.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Missed-Call Leads"
          value={missedCallLeads}
          description="Leads created or matched from Twilio voice traffic that fell through to the text-back flow."
          icon={PhoneCall}
          badges={
            textBackQueued > 0
              ? [
                  {
                    label: "Queued",
                    value: textBackQueued,
                  },
                ]
              : undefined
          }
        />

        <SummaryCard
          title="Text-Back Delivery"
          value={textBackSent}
          description="Missed-call SMS sends that completed successfully for the latest delivery attempt on each lead."
          icon={Send}
          badges={[
            ...(textBackFailed > 0
              ? [
                  {
                    label: "Failed",
                    value: textBackFailed,
                    className:
                      "border-transparent bg-rose-500/15 text-rose-700 dark:text-rose-200",
                  },
                ]
              : []),
            ...(textBackSuppressed > 0
              ? [
                  {
                    label: "Suppressed",
                    value: textBackSuppressed,
                    className:
                      "border-transparent bg-amber-500/15 text-amber-800 dark:text-amber-200",
                  },
                ]
              : []),
            ...(textBackProcessing > 0
              ? [
                  {
                    label: "Sending",
                    value: textBackProcessing,
                    className:
                      "border-transparent bg-sky-500/15 text-sky-700 dark:text-sky-200",
                  },
                ]
              : []),
            ...(textBackQueued > 0
              ? [
                  {
                    label: "Queued",
                    value: textBackQueued,
                  },
                ]
              : []),
          ]}
        />

        <SummaryCard
          title="SMS Replies"
          value={smsReplies}
          description="Inbound SMS replies that stopped automated follow-up and gave the operator a fresh signal to work."
          icon={MessageSquareReply}
        />

        <SummaryCard
          title="SMS Opt-Outs"
          value={optedOutLeads}
          description="Leads currently suppressed from future automated SMS because they opted out or were manually marked."
          icon={ShieldOff}
        />
      </div>
    </section>
  );
}
