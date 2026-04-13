import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  AlertTriangle,
  Briefcase,
  Calendar,
  Clock3,
  MapPin,
  MessageSquareReply,
  PhoneCall,
  ShieldOff,
  User,
  Users,
  Wrench,
} from "lucide-react";

import { BackButton } from "@/components/back-button";
import { LeadActivityFeed } from "@/components/dashboard/lead-activity-feed";
import { LeadResponseActions } from "@/components/dashboard/lead-response-actions";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectItem } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { hasLeadAuditSnapshot, parseLeadAuditSnapshot } from "@/lib/lead-intake";
import {
  LEAD_URGENCY_OPTIONS,
  formatLeadResponseDueAt,
  getLeadResponseSlaClassName,
  getLeadResponseSlaLabel,
  getLeadResponseSlaState,
  getLeadUrgencyBadgeClassName,
  getLeadUrgencyLabel,
  isLeadResponseOverdue,
} from "@/lib/lead-triage";
import { cn } from "@/lib/utils";

import {
  convertLeadToJob,
  getLeadById,
  getRecentLeadEvents,
  restartLeadFollowup,
  toggleLeadSmsDoNotContact,
  toggleLeadFollowupQueue,
  updateLeadStatus,
  updateLeadTriage,
} from "../actions";

interface LeadDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

function formatDate(value: string | null) {
  if (!value) {
    return "--";
  }

  return new Date(value).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "--";
  }

  return new Date(value).toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getStatusLabel(status: string) {
  switch (status) {
    case "booked":
      return "Audit booked";
    default:
      return status.replaceAll("_", " ");
  }
}

function getStatusBadgeClassName(status: string) {
  switch (status) {
    case "new":
      return "border-transparent bg-sky-500/15 text-sky-700 dark:text-sky-200";
    case "contacted":
      return "border-transparent bg-amber-500/15 text-amber-800 dark:text-amber-200";
    case "booked":
    case "won":
      return "border-transparent bg-emerald-500/15 text-emerald-800 dark:text-emerald-200";
    case "lost":
      return "border-transparent bg-muted text-muted-foreground";
    case "stale":
      return "border-transparent bg-orange-500/15 text-orange-800 dark:text-orange-200";
    default:
      return "border-transparent bg-muted text-muted-foreground";
  }
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

function getSmsIntentLabel(intent: string | null) {
  switch (intent) {
    case "opt_out":
      return "Opted out";
    case "pricing":
      return "Pricing reply";
    case "interested":
      return "Interested";
    case "question":
      return "Question";
    case "wrong_number":
      return "Wrong number";
    case "other":
      return "SMS reply";
    default:
      return "No reply yet";
  }
}

function getTextbackStatusLabel(status: string | null | undefined) {
  switch (status) {
    case "sent":
      return "Text-back sent";
    case "failed":
      return "Text-back failed";
    case "suppressed":
      return "Text-back suppressed";
    case "processing":
      return "Text-back sending";
    default:
      return "Text-back queued";
  }
}

function getTextbackStatusClassName(status: string | null | undefined) {
  switch (status) {
    case "sent":
      return "border-transparent bg-emerald-500/15 text-emerald-800 dark:text-emerald-200";
    case "failed":
      return "border-transparent bg-rose-500/15 text-rose-700 dark:text-rose-200";
    case "suppressed":
      return "border-transparent bg-amber-500/15 text-amber-800 dark:text-amber-200";
    case "processing":
      return "border-transparent bg-sky-500/15 text-sky-700 dark:text-sky-200";
    default:
      return "border-transparent bg-muted text-muted-foreground";
  }
}

function getFollowupStateBadgeClassName(state: string) {
  switch (state) {
    case "due":
      return "border-transparent bg-rose-500/15 text-rose-700 dark:text-rose-200";
    case "queued":
      return "border-transparent bg-sky-500/15 text-sky-700 dark:text-sky-200";
    case "paused":
      return "border-transparent bg-amber-500/15 text-amber-800 dark:text-amber-200";
    case "restartable":
      return "border-transparent bg-emerald-500/15 text-emerald-800 dark:text-emerald-200";
    default:
      return "border-transparent bg-muted text-muted-foreground";
  }
}

function getFollowupStateLabel(state: string) {
  switch (state) {
    case "due":
      return "Due";
    case "queued":
      return "Queued";
    case "paused":
      return "Paused";
    case "restartable":
      return "Completed";
    case "closed":
      return "Closed";
    default:
      return "Unavailable";
  }
}

function SnapshotItem({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof User;
  label: string;
  value: string;
  hint?: string | null;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border/70 bg-muted/30 p-4">
      <div className="rounded-lg bg-primary/10 p-2 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-medium">{value}</p>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
    </div>
  );
}

export default async function LeadDetailPage({
  params,
}: LeadDetailPageProps) {
  const { id } = await params;
  const lead = await getLeadById(id);

  if (!lead) {
    notFound();
  }

  const recentLeadEvents = await getRecentLeadEvents([lead.id]);
  const auditSnapshot = parseLeadAuditSnapshot({
    notes: lead.notes,
    meta: lead.created_event_meta,
    suburb: lead.suburb,
    jobType: lead.job_type,
  });
  const hasAuditSnapshot = hasLeadAuditSnapshot(auditSnapshot);
  const responseOverdue = isLeadResponseOverdue(
    lead.response_due_at,
    lead.status,
  );
  const responseSlaState = getLeadResponseSlaState({
    firstRespondedAt: lead.first_responded_at,
    lastContactedAt: lead.last_contacted_at,
    responseDueAt: lead.response_due_at,
    status: lead.status,
  });
  const textbackStatus = lead.latest_missed_call_textback?.status;
  const textbackTimestamp =
    lead.latest_missed_call_textback?.sent_at ||
    lead.latest_missed_call_textback?.updated_at ||
    null;
  const followupStep = lead.followup_step ?? 0;
  const canToggleFollowupQueue =
    Boolean(lead.email) &&
    !lead.converted_job_id &&
    ["new", "contacted"].includes(lead.status) &&
    [0, 1, 2].includes(followupStep);
  const canRestartFollowup =
    Boolean(lead.email) &&
    !lead.converted_job_id &&
    ["stale", "lost"].includes(lead.status);
  const followupState = !lead.email
    ? "unavailable"
    : canToggleFollowupQueue
      ? lead.next_followup_at
        ? "queued"
        : "paused"
      : canRestartFollowup
        ? "restartable"
        : "closed";
  const markContactedAction = async () => {
    "use server";
    await updateLeadStatus(lead.id, "contacted");
  };
  const markBookedAction = async () => {
    "use server";
    await updateLeadStatus(lead.id, "booked");
  };
  const markLostAction = async () => {
    "use server";
    await updateLeadStatus(lead.id, "lost");
  };
  const convertToJobAction = async () => {
    "use server";
    const jobId = await convertLeadToJob(lead.id);
    redirect(`/dashboard/jobs/${jobId}`);
  };
  const toggleSmsPreferenceAction = async () => {
    "use server";
    await toggleLeadSmsDoNotContact(lead.id);
  };
  const toggleFollowupQueueAction = async () => {
    "use server";
    await toggleLeadFollowupQueue(lead.id);
  };
  const restartFollowupAction = async () => {
    "use server";
    await restartLeadFollowup(lead.id);
  };
  const updateTriageAction = async (formData: FormData) => {
    "use server";
    await updateLeadTriage(lead.id, formData);
  };

  return (
    <div className="space-y-8">
      <div className="animate-in fade-in slide-in-from-top-4 duration-700">
        <div className="mb-3 flex items-center gap-4">
          <BackButton />
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{getSourceLabel(lead.source)}</Badge>
              <Badge className={cn("capitalize", getStatusBadgeClassName(lead.status))}>
                {getStatusLabel(lead.status)}
              </Badge>
              <Badge className={getLeadUrgencyBadgeClassName(lead.lead_urgency)}>
                {getLeadUrgencyLabel(lead.lead_urgency)}
              </Badge>
              <Badge className={getLeadResponseSlaClassName(responseSlaState)}>
                {getLeadResponseSlaLabel(responseSlaState)}
              </Badge>
              {responseOverdue ? (
                <Badge className="border-transparent bg-rose-500/15 text-rose-700 dark:text-rose-200">
                  SLA overdue
                </Badge>
              ) : null}
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">{lead.name}</h1>
            <p className="text-muted-foreground">
              {lead.job_type?.replaceAll("_", " ") || "General enquiry"}
              {lead.suburb ? ` in ${lead.suburb}` : ""}
              {lead.postcode ? ` ${lead.postcode}` : ""}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <LeadResponseActions lead={lead} />
            {lead.converted_job_id ? (
              <Link
                href={`/dashboard/jobs/${lead.converted_job_id}`}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                Open Converted Job
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      <Card
        className="shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700"
        style={{ animationDelay: "100ms", animationFillMode: "backwards" }}
      >
        <CardHeader>
          <CardTitle>Lead Snapshot</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SnapshotItem
            icon={User}
            label="Contact"
            value={lead.email || lead.phone || "No contact info"}
            hint={lead.email && lead.phone ? lead.phone : null}
          />
          <SnapshotItem
            icon={MapPin}
            label="Location"
            value={
              [lead.suburb, lead.postcode].filter(Boolean).join(" ") || "Not supplied"
            }
          />
          <SnapshotItem
            icon={Wrench}
            label="Service Request"
            value={lead.job_type?.replaceAll("_", " ") || "Not specified"}
            hint={`Captured ${formatDate(lead.created_at)}`}
          />
          <SnapshotItem
            icon={AlertTriangle}
            label="Emergency Triage"
            value={getLeadUrgencyLabel(lead.lead_urgency)}
            hint={`${getLeadResponseSlaLabel(responseSlaState)} | target ${formatLeadResponseDueAt(lead.response_due_at)}`}
          />
          <SnapshotItem
            icon={Calendar}
            label="Preferred Visit"
            value={lead.preferred_date ? formatDate(lead.preferred_date) : "No date requested"}
            hint={lead.preferred_time_window || "No time window provided"}
          />
        </CardContent>
      </Card>

      <Card
        className="shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700"
        style={{ animationDelay: "125ms", animationFillMode: "backwards" }}
      >
        <CardHeader>
          <CardTitle>Emergency Triage Control</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateTriageAction} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="lead_urgency">Response Lane</Label>
                <Select
                  id="lead_urgency"
                  name="lead_urgency"
                  defaultValue={lead.lead_urgency || "scheduled"}
                  required
                >
                  {LEAD_URGENCY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </Select>
                <p className="text-xs text-muted-foreground">
                  Saving recalculates the response SLA from now.
                </p>
              </div>

              <div className="space-y-2 xl:col-span-3">
                <Label htmlFor="triage_problem">Failure / Problem</Label>
                <Textarea
                  id="triage_problem"
                  name="triage_problem"
                  defaultValue={lead.triage_problem || ""}
                  maxLength={1000}
                  placeholder="e.g. no cooling during heatwave, burst flexi hose, switchboard fault"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
              <div className="space-y-2">
                <Label htmlFor="triage_site_risk">Access / Safety Context</Label>
                <Textarea
                  id="triage_site_risk"
                  name="triage_site_risk"
                  defaultValue={lead.triage_site_risk || ""}
                  maxLength={1000}
                  placeholder="e.g. tenant on site, water near power, elderly occupant, roof access required"
                />
                <label className="flex items-start gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    name="triage_safety_risk"
                    defaultChecked={Boolean(lead.triage_safety_risk)}
                    className="mt-1"
                  />
                  Safety-sensitive or property-damage risk is involved
                </label>
              </div>

              <Button type="submit" size="sm">
                Save Triage
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {hasAuditSnapshot ? (
        <Card
          className="shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700"
          style={{ animationDelay: "150ms", animationFillMode: "backwards" }}
        >
          <CardHeader>
            <CardTitle>Dispatch Audit Snapshot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SnapshotItem
                icon={Briefcase}
                label="Business"
                value={auditSnapshot.businessName || lead.name}
                hint={auditSnapshot.abn ? `ABN ${auditSnapshot.abn}` : "No ABN captured"}
              />
              <SnapshotItem
                icon={Users}
                label="Team Size"
                value={auditSnapshot.teamSize || "Not supplied"}
                hint={auditSnapshot.afterHoursCoverage || "No after-hours coverage captured"}
              />
              <SnapshotItem
                icon={MapPin}
                label="Dispatch Radius"
                value={auditSnapshot.dispatchRadius || "Not supplied"}
                hint={auditSnapshot.serviceArea || "No service area captured"}
              />
              <SnapshotItem
                icon={Wrench}
                label="Requested Work"
                value={auditSnapshot.serviceType || "Not specified"}
                hint="Captured from the public dispatch-audit intake"
              />
              <SnapshotItem
                icon={AlertTriangle}
                label="Triage"
                value={auditSnapshot.leadUrgency || getLeadUrgencyLabel(lead.lead_urgency)}
                hint={auditSnapshot.responseDueAt || formatLeadResponseDueAt(lead.response_due_at)}
              />
            </div>

            {lead.triage_problem || lead.triage_site_risk || lead.triage_safety_risk ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-border/70 bg-muted/30 p-4">
                  <p className="text-sm font-medium">Problem / Failure Mode</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                    {lead.triage_problem || auditSnapshot.triageProblem || "No triage problem captured"}
                  </p>
                </div>
                <div className="rounded-xl border border-border/70 bg-muted/30 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">Access / Safety Context</p>
                    {lead.triage_safety_risk ? (
                      <Badge className="border-transparent bg-rose-500/15 text-rose-700 dark:text-rose-200">
                        Safety risk
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                    {lead.triage_site_risk || auditSnapshot.triageSiteRisk || "No access or safety context captured"}
                  </p>
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/dashboard/settings"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                Review Workspace Settings
              </Link>
              <p className="text-xs text-muted-foreground">
                Use this snapshot to align the workspace dispatch profile and service coverage with the operator&apos;s intake.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div
        className="grid gap-4 xl:grid-cols-2 animate-in fade-in slide-in-from-bottom-4 duration-700"
        style={{ animationDelay: "200ms", animationFillMode: "backwards" }}
      >
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Pipeline State</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SnapshotItem
              icon={Clock3}
              label="Last Contacted"
              value={formatDateTime(lead.last_contacted_at)}
              hint={
                lead.next_followup_at
                  ? `Next follow-up ${formatDateTime(lead.next_followup_at)}`
                  : `First response ${formatDateTime(lead.first_responded_at)}`
              }
            />
            <SnapshotItem
              icon={Briefcase}
              label="Conversion"
              value={lead.converted_job_id ? "Converted to job" : "Still in lead pipeline"}
              hint={
                lead.converted_job_id
                  ? `Job ID ${lead.converted_job_id.slice(0, 8).toUpperCase()}`
                  : "Move this lead to audit booked or convert it from the leads table"
              }
            />
            <div className="rounded-xl border border-border/70 bg-muted/30 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Lead Nurture</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Controls the first-party follow-up email sequence used for inbound lead recovery.
                  </p>
                </div>
                <Badge className={getFollowupStateBadgeClassName(followupState)}>
                  {getFollowupStateLabel(followupState)}
                </Badge>
              </div>

              <div className="space-y-1 text-sm text-muted-foreground">
                <p>Current step: {followupStep}</p>
                <p>
                  {lead.next_followup_at
                    ? `Next send target ${formatDateTime(lead.next_followup_at)}`
                    : canRestartFollowup
                      ? "The prior sequence finished and can be restarted."
                      : canToggleFollowupQueue
                        ? "The follow-up queue is paused for this lead."
                        : !lead.email
                          ? "Add an email address before automated follow-up can run."
                          : "This lead is outside the active nurture workflow."}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {canToggleFollowupQueue ? (
                  <form action={toggleFollowupQueueAction}>
                    <Button
                      type="submit"
                      size="sm"
                      variant={lead.next_followup_at ? "outline" : "default"}
                    >
                      {lead.next_followup_at
                        ? "Pause Follow-up"
                        : "Queue Follow-up Now"}
                    </Button>
                  </form>
                ) : null}

                {canRestartFollowup ? (
                  <form action={restartFollowupAction}>
                    <Button type="submit" size="sm" variant="outline">
                      Restart 3-Step Nurture
                    </Button>
                  </form>
                ) : null}

                <p className="text-xs text-muted-foreground">
                  Only leads with an email address can enter the nurture queue.
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-border/70 bg-muted/30 p-4 space-y-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">Lead Actions</p>
                <p className="text-xs text-muted-foreground">
                  Work the lead from this page without jumping back to the table.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {lead.status === "new" ? (
                  <form action={markContactedAction}>
                    <Button type="submit" size="sm" variant="outline">
                      Mark Contacted
                    </Button>
                  </form>
                ) : null}

                {(lead.status === "new" || lead.status === "contacted") &&
                !lead.converted_job_id ? (
                  <form action={markBookedAction}>
                    <Button type="submit" size="sm" variant="outline">
                      Mark Audit Booked
                    </Button>
                  </form>
                ) : null}

                {lead.status === "booked" && !lead.converted_job_id ? (
                  <form action={convertToJobAction}>
                    <Button type="submit" size="sm">
                      Convert to Job
                    </Button>
                  </form>
                ) : null}

                {(lead.status === "new" || lead.status === "contacted") &&
                !lead.converted_job_id ? (
                  <form action={markLostAction}>
                    <Button type="submit" size="sm" variant="ghost">
                      Mark Lost
                    </Button>
                  </form>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Channel State</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-border/70 bg-muted/30 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Missed-Call Text Back</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Latest Twilio delivery state for the missed-call recovery flow.
                  </p>
                </div>
                <Badge className={getTextbackStatusClassName(textbackStatus)}>
                  {getTextbackStatusLabel(textbackStatus)}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {textbackTimestamp ? formatDateTime(textbackTimestamp) : "No missed-call text-back recorded"}
              </p>
              {lead.latest_missed_call_textback?.last_error ? (
                <p className="text-sm text-destructive">
                  Last Twilio error: {lead.latest_missed_call_textback.last_error}
                </p>
              ) : null}
            </div>

            <div className="rounded-xl border border-border/70 bg-muted/30 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  <MessageSquareReply className="h-4 w-4" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Inbound SMS State</p>
                  <p className="text-sm text-muted-foreground">
                    {getSmsIntentLabel(lead.sms_last_inbound_intent)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {lead.sms_last_inbound_at
                      ? `Last reply ${formatDateTime(lead.sms_last_inbound_at)}`
                      : "No inbound SMS reply recorded"}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border/70 bg-muted/30 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  {lead.sms_do_not_contact ? (
                    <ShieldOff className="h-4 w-4" />
                  ) : (
                    <PhoneCall className="h-4 w-4" />
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Automation Consent</p>
                  <p className="text-sm text-muted-foreground">
                    {lead.sms_do_not_contact
                      ? "Future automated SMS is suppressed for this lead."
                      : "Automated SMS can still be sent when the workflow calls for it."}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {lead.sms_do_not_contact
                      ? lead.sms_do_not_contact_reason || "Opt-out or operator suppression recorded"
                      : "No SMS suppression reason recorded"}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <form action={toggleSmsPreferenceAction}>
                  <Button
                    type="submit"
                    size="sm"
                    variant={lead.sms_do_not_contact ? "outline" : "ghost"}
                  >
                    {lead.sms_do_not_contact
                      ? "Re-enable Automated SMS"
                      : "Pause Automated SMS"}
                  </Button>
                </form>
                <p className="text-xs text-muted-foreground">
                  Use manual overrides only after confirming the customer&apos;s consent outside the automated flow.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {lead.notes ? (
        <Card
          className="shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700"
          style={{ animationDelay: "300ms", animationFillMode: "backwards" }}
        >
          <CardHeader>
            <CardTitle>Lead Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {lead.notes}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <div
        className="animate-in fade-in slide-in-from-bottom-4 duration-700"
        style={{ animationDelay: "400ms", animationFillMode: "backwards" }}
      >
        <LeadActivityFeed
          leads={[
            {
              id: lead.id,
              name: lead.name,
              phone: lead.phone,
              source: lead.source,
            },
          ]}
          events={recentLeadEvents}
          title="Lead Timeline"
          description="Channel events, operator status changes, and automation milestones for this specific lead."
          emptyCopy="No activity has been recorded for this lead yet."
          showLeadLinks={false}
        />
      </div>
    </div>
  );
}
