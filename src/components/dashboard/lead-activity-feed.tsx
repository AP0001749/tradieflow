import Link from "next/link";
import {
  AlertTriangle,
  ArrowRightLeft,
  CheckCircle2,
  Clock3,
  Mail,
  MessageSquareReply,
  PhoneCall,
  ShieldOff,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type FeedLead = {
  id: string;
  name: string;
  phone: string | null;
  source: string | null;
};

type FeedEvent = {
  id: string;
  lead_id: string;
  created_at: string | null;
  event_type: string;
  meta: unknown;
};

interface LeadActivityFeedProps {
  leads: FeedLead[];
  events: FeedEvent[];
  title?: string;
  description?: string;
  emptyCopy?: string;
  showLeadLinks?: boolean;
}

type EventVisual = {
  badgeLabel: string;
  badgeClassName?: string;
  title: string;
  description: string;
  icon: typeof Sparkles;
  iconClassName?: string;
};

function asRecord(value: unknown) {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function getString(meta: Record<string, unknown>, key: string) {
  const value = meta[key];
  return typeof value === "string" ? value : null;
}

function getNumber(meta: Record<string, unknown>, key: string) {
  const value = meta[key];
  return typeof value === "number" ? value : null;
}

function getRecord(meta: Record<string, unknown>, key: string) {
  return asRecord(meta[key]);
}

function trimMessage(value: string | null, limit = 96) {
  if (!value) {
    return null;
  }

  return value.length > limit ? `${value.slice(0, limit - 3)}...` : value;
}

function formatTimestamp(value: string | null) {
  if (!value) {
    return "Unknown time";
  }

  return new Date(value).toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getSourceLabel(source: string | null) {
  switch (source) {
    case "missed_call_text_back":
      return "Missed call";
    case "booking_form":
      return "Public form";
    default:
      return source?.replaceAll("_", " ") || "Lead";
  }
}

function getChannelLabel(channel: string | null) {
  switch (channel) {
    case "phone":
      return "Phone";
    case "sms":
      return "SMS";
    case "email":
      return "Email";
    default:
      return "Response";
  }
}

function getEventVisual(event: FeedEvent): EventVisual {
  const meta = asRecord(event.meta);
  const previous = getRecord(meta, "previous");
  const next = getRecord(meta, "next");
  const channel = getString(meta, "channel");
  const messageBody = trimMessage(getString(meta, "body"));
  const source = getString(meta, "source");
  const serviceType = getString(meta, "service_type");
  const newStatus = getString(meta, "new_status");
  const nextLeadUrgency = getString(next, "lead_urgency");
  const previousLeadUrgency =
    getString(meta, "previous_urgency") || getString(previous, "lead_urgency");
  const responseDueAt =
    getString(meta, "response_due_at") || getString(next, "response_due_at");
  const followupStep = getNumber(meta, "followup_step");
  const followupNextAt = getString(meta, "next_followup_at");
  const smsDoNotContact =
    typeof meta.sms_do_not_contact === "boolean"
      ? meta.sms_do_not_contact
      : null;
  const followupActive =
    typeof meta.active === "boolean" ? meta.active : null;
  const errorMessage =
    trimMessage(getString(meta, "error")) ||
    trimMessage(getString(meta, "message")) ||
    trimMessage(getString(meta, "last_error"));

  switch (event.event_type) {
    case "created":
      return {
        badgeLabel: source === "book_page" ? "Audit captured" : "Captured",
        title:
          source === "book_page"
            ? "Dispatch-audit request captured"
            : "New lead captured",
        description:
          source === "book_page"
            ? serviceType
              ? `A new dispatch-audit request came in for ${serviceType}.`
              : "A new dispatch-audit request entered the Zero-Leak funnel."
            : "A new inbound lead entered the Zero-Leak funnel.",
        icon: Sparkles,
        iconClassName: "text-sky-600 dark:text-sky-300",
      };
    case "missed_call_text_back_sent":
      return {
        badgeLabel: "Text-back sent",
        badgeClassName:
          "border-transparent bg-emerald-500/15 text-emerald-800 dark:text-emerald-200",
        title: "Missed-call text-back sent",
        description:
          "TradieFlow caught the missed call and answered with the Twilio SMS template.",
        icon: PhoneCall,
        iconClassName: "text-emerald-600 dark:text-emerald-300",
      };
    case "missed_call_escalated":
      return {
        badgeLabel: "Emergency lane",
        badgeClassName:
          "border-transparent bg-rose-500/15 text-rose-700 dark:text-rose-200",
        title: "Missed call escalated",
        description:
          previousLeadUrgency && previousLeadUrgency !== "emergency"
            ? `A fresh missed call moved this lead from ${previousLeadUrgency.replaceAll("_", " ")} into emergency triage.`
            : responseDueAt
              ? "A fresh missed call refreshed the emergency response SLA for this lead."
              : "A fresh missed call moved this lead into emergency triage for operator recovery.",
        icon: AlertTriangle,
        iconClassName: "text-rose-600 dark:text-rose-300",
      };
    case "missed_call_text_back_suppressed":
      return {
        badgeLabel: "Suppressed",
        badgeClassName:
          "border-transparent bg-amber-500/15 text-amber-800 dark:text-amber-200",
        title: "Missed-call text-back suppressed",
        description:
          "SMS delivery was intentionally blocked because this lead is marked do-not-contact.",
        icon: ShieldOff,
        iconClassName: "text-amber-600 dark:text-amber-300",
      };
    case "sms_received":
      return {
        badgeLabel: "SMS reply",
        badgeClassName:
          "border-transparent bg-sky-500/15 text-sky-700 dark:text-sky-200",
        title: "Inbound SMS reply received",
        description:
          messageBody ||
          "The lead replied by SMS and the automated follow-up sequence was cleared.",
        icon: MessageSquareReply,
        iconClassName: "text-sky-600 dark:text-sky-300",
      };
    case "sms_opt_out":
      return {
        badgeLabel: "Opt-out",
        badgeClassName:
          "border-transparent bg-rose-500/15 text-rose-700 dark:text-rose-200",
        title: "SMS opt-out received",
        description:
          messageBody ||
          "The lead sent a STOP-style reply and future automated SMS is now suppressed.",
        icon: ShieldOff,
        iconClassName: "text-rose-600 dark:text-rose-300",
      };
    case "sms_wrong_number_suppressed":
      return {
        badgeLabel: "Wrong number",
        badgeClassName:
          "border-transparent bg-rose-500/15 text-rose-700 dark:text-rose-200",
        title: "Wrong-number reply suppressed SMS",
        description:
          messageBody ||
          "The lead replied that this is the wrong number, so future automated SMS is now suppressed.",
        icon: ShieldOff,
        iconClassName: "text-rose-600 dark:text-rose-300",
      };
    case "sms_preference_changed":
      return {
        badgeLabel: smsDoNotContact ? "SMS paused" : "SMS enabled",
        badgeClassName: smsDoNotContact
          ? "border-transparent bg-amber-500/15 text-amber-800 dark:text-amber-200"
          : "border-transparent bg-emerald-500/15 text-emerald-800 dark:text-emerald-200",
        title: smsDoNotContact
          ? "Automated SMS paused"
          : "Automated SMS re-enabled",
        description: smsDoNotContact
          ? "An operator manually paused future automated SMS for this lead."
          : "An operator manually re-enabled automated SMS for this lead.",
        icon: ShieldOff,
        iconClassName: smsDoNotContact
          ? "text-amber-600 dark:text-amber-300"
          : "text-emerald-600 dark:text-emerald-300",
      };
    case "followup_queue_changed":
      return {
        badgeLabel: followupActive ? "Queued" : "Paused",
        badgeClassName: followupActive
          ? "border-transparent bg-sky-500/15 text-sky-700 dark:text-sky-200"
          : "border-transparent bg-amber-500/15 text-amber-800 dark:text-amber-200",
        title: followupActive ? "Lead nurture queued" : "Lead nurture paused",
        description: followupActive
          ? followupNextAt
            ? `The operator armed follow-up step ${followupStep ?? 0} and queued it for dispatch.`
            : "The operator armed the lead follow-up queue."
          : "The operator paused the lead follow-up queue.",
        icon: Clock3,
        iconClassName: followupActive
          ? "text-sky-600 dark:text-sky-300"
          : "text-amber-600 dark:text-amber-300",
      };
    case "followup_restarted":
      return {
        badgeLabel: "Restarted",
        badgeClassName:
          "border-transparent bg-emerald-500/15 text-emerald-800 dark:text-emerald-200",
        title: "Lead nurture restarted",
        description:
          "The operator reset the 3-step lead nurture sequence and queued the first follow-up again.",
        icon: Clock3,
        iconClassName: "text-emerald-600 dark:text-emerald-300",
      };
    case "email_sent":
      return {
        badgeLabel: "Email sent",
        title: "Follow-up email sent",
        description:
          followupStep !== null
            ? `Lead nurture step ${followupStep} was sent successfully.`
            : "A follow-up email was sent successfully.",
        icon: Mail,
        iconClassName: "text-indigo-600 dark:text-indigo-300",
      };
    case "operator_response_started":
      return {
        badgeLabel: `${getChannelLabel(channel)} started`,
        badgeClassName:
          "border-transparent bg-emerald-500/15 text-emerald-800 dark:text-emerald-200",
        title: "Operator response started",
        description:
          channel === "phone"
            ? "An operator started a phone response and stamped the first-contact SLA."
            : channel === "sms"
              ? "An operator started an SMS response and stamped the first-contact SLA."
              : channel === "email"
                ? "An operator started an email response and stamped the first-contact SLA."
                : "An operator started a response and stamped the first-contact SLA.",
        icon: channel === "email" ? Mail : channel === "sms" ? MessageSquareReply : PhoneCall,
        iconClassName: "text-emerald-600 dark:text-emerald-300",
      };
    case "triage_updated":
      return {
        badgeLabel: "Triage updated",
        badgeClassName:
          "border-transparent bg-amber-500/15 text-amber-800 dark:text-amber-200",
        title: "Emergency triage updated",
        description:
          previousLeadUrgency && nextLeadUrgency && previousLeadUrgency !== nextLeadUrgency
            ? `Operator moved response urgency from ${previousLeadUrgency.replaceAll("_", " ")} to ${nextLeadUrgency.replaceAll("_", " ")}.`
            : "Operator refreshed the lead's problem, site-risk, or safety triage notes.",
        icon: AlertTriangle,
        iconClassName: "text-amber-600 dark:text-amber-300",
      };
    case "status_changed":
      return {
        badgeLabel: "Status update",
        title: "Lead status changed",
        description: newStatus
          ? `The lead was moved to ${newStatus.replaceAll("_", " ")}.`
          : "The lead status was updated by an operator.",
        icon: ArrowRightLeft,
        iconClassName: "text-violet-600 dark:text-violet-300",
      };
    case "converted":
      return {
        badgeLabel: "Converted",
        badgeClassName:
          "border-transparent bg-emerald-500/15 text-emerald-800 dark:text-emerald-200",
        title: "Lead converted to job",
        description: "The lead graduated into an active job record.",
        icon: CheckCircle2,
        iconClassName: "text-emerald-600 dark:text-emerald-300",
      };
    case "error":
      return {
        badgeLabel: "Error",
        badgeClassName:
          "border-transparent bg-rose-500/15 text-rose-700 dark:text-rose-200",
        title: "Automation error recorded",
        description:
          errorMessage || "A follow-up attempt failed and needs operator review.",
        icon: AlertTriangle,
        iconClassName: "text-rose-600 dark:text-rose-300",
      };
    default:
      return {
        badgeLabel: event.event_type.replaceAll("_", " "),
        title: event.event_type.replaceAll("_", " "),
        description: messageBody || "Lead activity was recorded on this workspace.",
        icon: Sparkles,
        iconClassName: "text-muted-foreground",
      };
  }
}

export function LeadActivityFeed({
  leads,
  events,
  title = "Recent Lead Activity",
  description = "Latest channel and automation events across captured leads so the team can spot replies, failures, and conversions quickly.",
  emptyCopy = "No lead activity has been recorded yet.",
  showLeadLinks = true,
}: LeadActivityFeedProps) {
  const leadsById = new Map(leads.map((lead) => [lead.id, lead]));

  return (
    <section className="section-card space-y-5">
      <div className="section-heading">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>

      {events.length > 0 ? (
        <div className="space-y-3">
          {events.map((event) => {
            const lead = leadsById.get(event.lead_id);
            const visual = getEventVisual(event);
            const Icon = visual.icon;

            return (
              <Card
                key={event.id}
                className="border-border/60 bg-card/70 p-4 backdrop-blur-sm"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="flex min-w-0 gap-3">
                    <div className="mt-0.5 rounded-lg bg-muted/60 p-2">
                      <Icon className={`h-4 w-4 ${visual.iconClassName || ""}`} />
                    </div>

                    <div className="min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{visual.title}</p>
                        <Badge
                          variant="outline"
                          className={visual.badgeClassName}
                        >
                          {visual.badgeLabel}
                        </Badge>
                        {lead ? (
                          <Badge variant="outline">
                            {getSourceLabel(lead.source)}
                          </Badge>
                        ) : null}
                      </div>

                      <p className="text-sm text-muted-foreground">
                        {visual.description}
                      </p>

                      {lead ? (
                        showLeadLinks ? (
                          <Link
                            href={`/dashboard/leads/${lead.id}`}
                            className="text-xs text-muted-foreground/80 transition-colors hover:text-foreground hover:underline"
                          >
                            {lead.name}
                            {lead.phone ? ` - ${lead.phone}` : ""}
                          </Link>
                        ) : (
                          <p className="text-xs text-muted-foreground/80">
                            {lead.name}
                            {lead.phone ? ` - ${lead.phone}` : ""}
                          </p>
                        )
                      ) : (
                        <p className="text-xs text-muted-foreground/80">
                          Lead unavailable
                        </p>
                      )}
                    </div>
                  </div>

                  <p className="shrink-0 text-xs text-muted-foreground">
                    {formatTimestamp(event.created_at)}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border/70 bg-muted/30 px-4 py-5 text-sm text-muted-foreground">
          {emptyCopy}
        </div>
      )}
    </section>
  );
}
