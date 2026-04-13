import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { JobPhotos } from "@/components/job-photos";
import { DispatchBriefActions } from "@/components/dashboard/dispatch-brief-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { BackButton } from "@/components/back-button";
import { AlertTriangle, Calendar, Clock3, DollarSign, MapPinned, ShieldCheck, User, UserRound, Wrench, FileText } from "lucide-react";
import {
  formatDispatchCheckInTimestamp,
  getDispatchCheckInLabel,
  getDispatchCheckInVariant,
} from "@/lib/dispatch-check-in";
import { formatDispatchBrief } from "@/lib/dispatch-brief";
import {
  buildDispatchGeoMapUrl,
  formatDispatchGeoAccuracy,
  formatDispatchGeoPoint,
  formatDispatchGeoTimestamp,
} from "@/lib/dispatch-geo";
import { JobStatus } from "@/types";
import {
  rotateJobFieldCheckInLink,
  setJobFieldCheckInLinkEnabled,
  toggleQuoteFollowupSent,
  toggleQuoteSent,
} from "../actions";
import {
  formatAutomationTimestamp,
  getAutomationDueAt,
  isAutomationDue,
} from "@/lib/zero-leak";
import {
  getDispatchPriorityLabel,
  getDispatchPriorityVariant,
  getServiceWindowLabel,
} from "@/lib/job-dispatch";
import {
  getTradeVerticalLabel,
  getWarrantyStatusLabel,
} from "@/lib/trade-jobs";

interface JobDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

type DispatchTimelineEvent = {
  id: string;
  event_source: string;
  event_type: string;
  dispatch_check_in_status: string | null;
  dispatch_eta_note: string | null;
  dispatch_last_known_location: string | null;
  dispatch_geo_latitude: number | null;
  dispatch_geo_longitude: number | null;
  dispatch_geo_accuracy_meters: number | null;
  dispatch_geo_captured_at: string | null;
  created_at: string;
};

function formatDispatchEventType(value: string) {
  switch (value) {
    case "check_in":
      return "Check-In";
    case "link_paused":
      return "Link Paused";
    case "link_resumed":
      return "Link Resumed";
    case "link_rotated":
      return "Link Rotated";
    case "dispatch_update":
      return "Dispatch Update";
    default:
      return value.replaceAll("_", " ");
  }
}

function formatDispatchEventSource(value: string) {
  switch (value) {
    case "field_link":
      return "Field Link";
    case "operator":
      return "Operator";
    case "system":
      return "System";
    default:
      return value.replaceAll("_", " ");
  }
}

export default async function JobDetailPage({ params }: JobDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Fetch job details with client information
  const { data: job, error } = await supabase
    .from("jobs")
    .select(`
      *,
      clients (
        name,
        address,
        phone,
        email
      )
    `)
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !job) {
    notFound();
  }

  const { data: businessProfile } = await supabase
    .from("business_profile")
    .select("quote_followup_enabled, quote_followup_delay_hours")
    .eq("user_id", user.id)
    .maybeSingle();
  const { data: linkedInvoice } = await supabase
    .from("invoices")
    .select("id, amount, status, due_date, paid_at, review_request_sent_at")
    .eq("job_id", job.id)
    .eq("user_id", user.id)
    .maybeSingle();
  const { data: dispatchEvents } = await supabase
    .from("job_dispatch_events")
    .select(`
      id,
      event_source,
      event_type,
      dispatch_check_in_status,
      dispatch_eta_note,
      dispatch_last_known_location,
      dispatch_geo_latitude,
      dispatch_geo_longitude,
      dispatch_geo_accuracy_meters,
      dispatch_geo_captured_at,
      created_at
    `)
    .eq("job_id", job.id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(8);

  // Fetch existing photos from storage
  const { data: files } = await supabase.storage
    .from("job-photos")
    .list(`${user.id}/${id}`);

  // Generate signed URLs in parallel to avoid N+1 sequential calls
  const photos = files
    ? (
        await Promise.all(
          files.map(async (file) => {
            const filePath = `${user.id}/${id}/${file.name}`;
            const { data: signedUrlData } = await supabase.storage
              .from("job-photos")
              .createSignedUrl(filePath, 3600); // 1 hour
            return signedUrlData
              ? { name: file.name, url: signedUrlData.signedUrl, path: filePath }
              : null;
          })
        )
      ).filter((p): p is NonNullable<typeof p> => p !== null)
    : [];

  const statusConfig: Record<
    JobStatus,
    {
      label: string;
      variant: "draft" | "scheduled" | "in_progress" | "completed" | "cancelled";
    }
  > = {
    draft: { label: "Draft", variant: "draft" },
    scheduled: { label: "Scheduled", variant: "scheduled" },
    "in_progress": { label: "In Progress", variant: "in_progress" },
    completed: { label: "Completed", variant: "completed" },
    cancelled: { label: "Cancelled", variant: "cancelled" },
  };

  const status =
    statusConfig[(job.status as JobStatus) ?? "draft"] ?? statusConfig.draft;
  const quoteSentLogged = Boolean(job.quote_sent_at);
  const quoteFollowupDelayHours = businessProfile?.quote_followup_delay_hours ?? 48;
  const quoteFollowupDueAt = getAutomationDueAt(
    job.quote_sent_at,
    quoteFollowupDelayHours
  );
  const quoteFollowupIsDue = isAutomationDue(quoteFollowupDueAt);
  const invoiceStatusLabel = linkedInvoice?.status
    ? linkedInvoice.status.replaceAll("_", " ")
    : "No invoice created";
  const dispatchBrief = formatDispatchBrief({
    title: job.title,
    clientName: job.clients?.name,
    clientPhone: job.clients?.phone,
    clientEmail: job.clients?.email,
    siteAddress: job.clients?.address,
    dispatchSequence: job.dispatch_sequence,
    dispatchCheckInStatus: job.dispatch_check_in_status,
    dispatchEtaNote: job.dispatch_eta_note,
    dispatchLastKnownLocation: job.dispatch_last_known_location,
    dispatchLastCheckedInAt: job.dispatch_last_checked_in_at,
    dispatchGeoLatitude: job.dispatch_geo_latitude,
    dispatchGeoLongitude: job.dispatch_geo_longitude,
    dispatchGeoAccuracyMeters: job.dispatch_geo_accuracy_meters,
    dispatchGeoCapturedAt: job.dispatch_geo_captured_at,
    dispatchPriority: job.dispatch_priority,
    serviceWindow: job.service_window,
    assignedTechnician: job.assigned_technician,
    tradeVertical: job.trade_vertical,
    scheduledDate: job.start_date,
    description: job.description,
    siteAccessNotes: job.site_access_notes,
  });
  const toggleQuoteSentAction = async () => {
    "use server";
    await toggleQuoteSent(job.id);
  };
  const toggleQuoteFollowupSentAction = async () => {
    "use server";
    await toggleQuoteFollowupSent(job.id);
  };
  const toggleFieldCheckInLinkAction = async () => {
    "use server";
    await setJobFieldCheckInLinkEnabled(job.id, job.dispatch_share_enabled === false);
  };
  const rotateFieldCheckInLinkAction = async () => {
    "use server";
    await rotateJobFieldCheckInLink(job.id);
  };
  const fieldCheckInHref = job.dispatch_share_token
    ? `/field/${job.dispatch_share_token}`
    : null;
  const fieldCheckInEnabled = job.dispatch_share_enabled !== false;
  const appOrigin = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "");
  const fieldCheckInUrl =
    fieldCheckInHref && appOrigin ? `${appOrigin}${fieldCheckInHref}` : fieldCheckInHref;
  const gpsPoint = formatDispatchGeoPoint(
    job.dispatch_geo_latitude,
    job.dispatch_geo_longitude,
  );
  const gpsAccuracy = formatDispatchGeoAccuracy(job.dispatch_geo_accuracy_meters);
  const gpsMapUrl = buildDispatchGeoMapUrl(
    job.dispatch_geo_latitude,
    job.dispatch_geo_longitude,
  );
  const timelineEvents = (dispatchEvents || []) as DispatchTimelineEvent[];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-in fade-in slide-in-from-top-4 duration-700">
        <div className="flex items-center gap-4 mb-2">
          <BackButton />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">{job.title}</h1>
        <p className="text-muted-foreground mt-1">Job details and photos</p>
      </div>

      {/* Job Details Card */}
      <Card className="shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}>
        <CardHeader>
          <CardTitle className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span>Job Information</span>
            <Badge variant={status.variant}>{status.label}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Client */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/15 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-blue-300" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Client</p>
                <p className="font-medium">
                  {job.clients?.name || "--"}
                </p>
              </div>
            </div>

            {/* Price */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                <DollarSign className="w-5 h-5 text-emerald-300" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Price</p>
                <p className="font-medium">
                  {job.price ? `$${job.price.toFixed(2)}` : "Not set"}
                </p>
              </div>
            </div>

            {/* Start Date */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5 text-emerald-300" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Start Date</p>
                <p className="font-medium">
                  {job.start_date
                    ? new Date(job.start_date).toLocaleDateString()
                    : "Not scheduled"}
                </p>
              </div>
            </div>

            {/* End Date */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5 text-emerald-300" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">End Date</p>
                <p className="font-medium">
                  {job.end_date
                    ? new Date(job.end_date).toLocaleDateString()
                    : "Not set"}
                </p>
              </div>
            </div>
          </div>

          {/* Description */}
          {job.description && (
            <div className="mt-6 pt-6 border-t border-border">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-500/15 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-orange-300" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1">Description</p>
                  <p className="whitespace-pre-wrap">{job.description}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card
        className="shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700"
        style={{ animationDelay: "225ms", animationFillMode: "backwards" }}
      >
        <CardHeader>
          <CardTitle className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span>Dispatch Snapshot</span>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={getDispatchPriorityVariant(job.dispatch_priority)}>
                {getDispatchPriorityLabel(job.dispatch_priority)}
              </Badge>
              <Badge variant={getDispatchCheckInVariant(job.dispatch_check_in_status)}>
                {getDispatchCheckInLabel(job.dispatch_check_in_status)}
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-xl border border-border/70 bg-muted/30 p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-500/15 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5 text-indigo-300" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Run Order</p>
                <p className="font-medium">
                  {job.dispatch_sequence ? `#${job.dispatch_sequence}` : "Auto"}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border/70 bg-muted/30 p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-300" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Dispatch Priority</p>
                <p className="font-medium">{getDispatchPriorityLabel(job.dispatch_priority)}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border/70 bg-muted/30 p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/15 flex items-center justify-center flex-shrink-0">
                <Clock3 className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Service Window</p>
                <p className="font-medium">{getServiceWindowLabel(job.service_window)}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border/70 bg-muted/30 p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-sky-500/15 flex items-center justify-center flex-shrink-0">
                <UserRound className="w-5 h-5 text-sky-300" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Assigned Tech / Crew</p>
                <p className="font-medium">{job.assigned_technician || "Unassigned crew"}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border/70 bg-muted/30 p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-violet-500/15 flex items-center justify-center flex-shrink-0">
                <MapPinned className="w-5 h-5 text-violet-300" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Site Address</p>
                <p className="font-medium">{job.clients?.address || "No client address saved"}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card
        className="shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700"
        style={{ animationDelay: "232ms", animationFillMode: "backwards" }}
      >
        <CardHeader>
          <CardTitle>Field Check-In</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-xl border border-border/70 bg-muted/30 p-4">
              <p className="text-sm text-muted-foreground">Crew Status</p>
              <p className="mt-1 font-medium">
                {getDispatchCheckInLabel(job.dispatch_check_in_status)}
              </p>
            </div>
            <div className="rounded-xl border border-border/70 bg-muted/30 p-4">
              <p className="text-sm text-muted-foreground">ETA / Arrival Note</p>
              <p className="mt-1 font-medium">{job.dispatch_eta_note || "Not logged"}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-muted/30 p-4">
              <p className="text-sm text-muted-foreground">Last Known Location</p>
              <p className="mt-1 font-medium">
                {job.dispatch_last_known_location || "Not logged"}
              </p>
            </div>
            <div className="rounded-xl border border-border/70 bg-muted/30 p-4">
              <p className="text-sm text-muted-foreground">Last Crew Update</p>
              <p className="mt-1 font-medium">
                {formatDispatchCheckInTimestamp(job.dispatch_last_checked_in_at)}
              </p>
            </div>
            <div className="rounded-xl border border-border/70 bg-muted/30 p-4">
              <p className="text-sm text-muted-foreground">Last GPS Point</p>
              <p className="mt-1 font-medium">
                {gpsPoint ? (
                  gpsMapUrl ? (
                    <a
                      href={gpsMapUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="underline-offset-4 hover:underline"
                    >
                      {gpsPoint}
                    </a>
                  ) : (
                    gpsPoint
                  )
                ) : (
                  "Not captured"
                )}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {gpsAccuracy ? `${gpsAccuracy} accuracy | ` : ""}
                {formatDispatchGeoTimestamp(job.dispatch_geo_captured_at)}
              </p>
            </div>
          </div>

          {fieldCheckInUrl && fieldCheckInHref ? (
            <div className="rounded-xl border border-border/70 bg-muted/30 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">Technician Check-In Link</p>
                    <Badge variant={fieldCheckInEnabled ? "completed" : "outline"}>
                      {fieldCheckInEnabled ? "Enabled" : "Paused"}
                    </Badge>
                  </div>
                  <p className="break-all text-sm text-muted-foreground">
                    {fieldCheckInUrl}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {fieldCheckInEnabled
                      ? "Share with the assigned crew so they can update status, ETA, and optional GPS from mobile."
                      : "This link is paused. Resume it before sending to a crew."}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {fieldCheckInEnabled ? (
                    <Link
                      href={fieldCheckInHref}
                      target="_blank"
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      Open Crew Link
                    </Link>
                  ) : null}
                  <form action={toggleFieldCheckInLinkAction}>
                    <Button
                      type="submit"
                      size="sm"
                      variant={fieldCheckInEnabled ? "outline" : "default"}
                    >
                      {fieldCheckInEnabled ? "Pause Link" : "Resume Link"}
                    </Button>
                  </form>
                  <form action={rotateFieldCheckInLinkAction}>
                    <Button type="submit" size="sm" variant="ghost">
                      Rotate Link
                    </Button>
                  </form>
                </div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card
        className="shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700"
        style={{ animationDelay: "236ms", animationFillMode: "backwards" }}
      >
        <CardHeader>
          <CardTitle>Dispatch Timeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {timelineEvents.length > 0 ? (
            timelineEvents.map((event) => {
              const eventGpsPoint = formatDispatchGeoPoint(
                event.dispatch_geo_latitude,
                event.dispatch_geo_longitude,
              );
              const eventGpsMapUrl = buildDispatchGeoMapUrl(
                event.dispatch_geo_latitude,
                event.dispatch_geo_longitude,
              );
              const eventGpsAccuracy = formatDispatchGeoAccuracy(
                event.dispatch_geo_accuracy_meters,
              );

              return (
                <div
                  key={event.id}
                  className="rounded-xl border border-border/70 bg-muted/30 p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">
                          {formatDispatchEventType(event.event_type)}
                        </p>
                        <Badge variant="outline">
                          {formatDispatchEventSource(event.event_source)}
                        </Badge>
                        {event.dispatch_check_in_status ? (
                          <Badge
                            variant={getDispatchCheckInVariant(
                              event.dispatch_check_in_status,
                            )}
                          >
                            {getDispatchCheckInLabel(event.dispatch_check_in_status)}
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatDispatchCheckInTimestamp(event.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-2 text-sm text-muted-foreground md:grid-cols-3">
                    <p>ETA: {event.dispatch_eta_note || "Not logged"}</p>
                    <p>
                      Location:{" "}
                      {event.dispatch_last_known_location || "No location note"}
                    </p>
                    <p>
                      GPS:{" "}
                      {eventGpsPoint ? (
                        eventGpsMapUrl ? (
                          <a
                            href={eventGpsMapUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="underline-offset-4 hover:underline"
                          >
                            {eventGpsPoint}
                            {eventGpsAccuracy ? ` (${eventGpsAccuracy})` : ""}
                          </a>
                        ) : (
                          `${eventGpsPoint}${eventGpsAccuracy ? ` (${eventGpsAccuracy})` : ""}`
                        )
                      ) : (
                        "Not captured"
                      )}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-5 text-sm text-muted-foreground">
              No dispatch events logged yet. Operator edits and technician check-ins
              will appear here once the event migration is live.
            </div>
          )}
        </CardContent>
      </Card>

      <Card
        className="shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700"
        style={{ animationDelay: "240ms", animationFillMode: "backwards" }}
      >
        <CardHeader>
          <CardTitle>Dispatch Brief</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Copy this handoff pack for the assigned crew or use the contact shortcuts
            to reach the customer directly from the job record.
          </p>

          <pre className="overflow-x-auto rounded-xl border border-border/70 bg-muted/30 p-4 text-sm text-foreground whitespace-pre-wrap">
            {dispatchBrief}
          </pre>

          <DispatchBriefActions
            briefText={dispatchBrief}
            phone={job.clients?.phone}
            email={job.clients?.email}
          />
        </CardContent>
      </Card>

      <Card
        className="shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700"
        style={{ animationDelay: "250ms", animationFillMode: "backwards" }}
      >
        <CardHeader>
          <CardTitle>Trade Ops Snapshot</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-border/70 bg-muted/30 p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-sky-500/15 flex items-center justify-center flex-shrink-0">
                <Wrench className="w-5 h-5 text-sky-300" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Trade Vertical</p>
                <p className="font-medium">{getTradeVerticalLabel(job.trade_vertical)}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border/70 bg-muted/30 p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-5 h-5 text-emerald-300" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Warranty Status</p>
                <p className="font-medium">{getWarrantyStatusLabel(job.warranty_status)}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border/70 bg-muted/30 p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/15 flex items-center justify-center flex-shrink-0">
                <Wrench className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Equipment / System</p>
                <p className="font-medium">{job.equipment_make || "Not recorded"}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border/70 bg-muted/30 p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-violet-500/15 flex items-center justify-center flex-shrink-0">
                <MapPinned className="w-5 h-5 text-violet-300" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Site Access</p>
                <p className="font-medium">{job.site_access_notes || "No access notes logged"}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card
        className="shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700"
        style={{ animationDelay: "275ms", animationFillMode: "backwards" }}
      >
        <CardHeader>
          <CardTitle>Revenue Handoff</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-border/70 bg-muted/30 p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Invoice State</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Tracks whether this job has moved from quote/work execution into billing.
                  </p>
                </div>
                <Badge
                  variant={
                    linkedInvoice
                      ? linkedInvoice.status === "paid"
                        ? "completed"
                        : linkedInvoice.status === "overdue"
                          ? "overdue"
                          : linkedInvoice.status === "sent"
                            ? "sent"
                            : "destructive"
                      : "outline"
                  }
                  className="capitalize"
                >
                  {invoiceStatusLabel}
                </Badge>
              </div>

              <div className="space-y-1 text-sm text-muted-foreground">
                {linkedInvoice ? (
                  <>
                    <p>Amount: ${linkedInvoice.amount.toLocaleString()}</p>
                    <p>
                      Due:{" "}
                      {linkedInvoice.due_date
                        ? new Date(linkedInvoice.due_date).toLocaleDateString("en-AU")
                        : "No due date set"}
                    </p>
                    <p>
                      {linkedInvoice.status === "paid"
                        ? linkedInvoice.review_request_sent_at
                          ? "Payment landed and the review request has already been logged."
                          : "Payment landed. Next step is review extraction."
                        : linkedInvoice.status === "sent"
                          ? "Invoice is out with the customer. Next step is payment collection."
                          : linkedInvoice.status === "overdue"
                            ? "Invoice is overdue and needs operator follow-up."
                            : "Invoice exists but still needs sending or payment follow-up."}
                    </p>
                  </>
                ) : (
                  <>
                    <p>No invoice has been created for this job yet.</p>
                    <p>
                      {job.price
                        ? "The invoice form will prefill from the job price when you create the handoff."
                        : "Set the commercial amount on the job first so the invoice handoff is faster."}
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-border/70 bg-muted/30 p-4 space-y-3">
              <div>
                <p className="text-sm font-medium">Recommended Next Step</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Keep the quote-to-cash path visible so accepted work does not stall between field ops and billing.
                </p>
              </div>

              <p className="text-sm text-muted-foreground">
                {linkedInvoice
                  ? linkedInvoice.status === "paid"
                    ? "Open the invoice record to verify payment logging and review automation."
                    : "Open the invoice record to send, chase, or mark payment for this job."
                  : quoteSentLogged
                    ? "The quote is logged. If the customer accepted, move this job into an invoice now."
                    : "Finish the commercial handoff by logging the quote and creating the invoice once approved."}
              </p>

              <div className="flex flex-wrap items-center gap-2">
                {linkedInvoice ? (
                  <Link
                    href={`/dashboard/invoices/${linkedInvoice.id}`}
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    Open Invoice
                  </Link>
                ) : (
                  <Link
                    href={`/dashboard/invoices?job=${job.id}&create=1`}
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    Create Invoice
                  </Link>
                )}
                <Link
                  href="/dashboard/invoices"
                  className={buttonVariants({ variant: "ghost", size: "sm" })}
                >
                  View All Invoices
                </Link>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card
        className="shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700"
        style={{ animationDelay: "300ms", animationFillMode: "backwards" }}
      >
        <CardHeader>
          <CardTitle>Quote Automation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-border/70 bg-muted/30 p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Quote Sent</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Timestamp used to start the nurture timer.
                  </p>
                </div>
                <Badge variant={job.quote_sent_at ? "completed" : "outline"}>
                  {job.quote_sent_at ? "Logged" : "Open"}
                </Badge>
              </div>

              <p className="text-sm text-muted-foreground">
                {formatAutomationTimestamp(job.quote_sent_at)}
              </p>

              <form action={toggleQuoteSentAction}>
                <Button type="submit" size="sm" variant={job.quote_sent_at ? "outline" : "default"}>
                  {job.quote_sent_at ? "Clear Quote Timestamp" : "Mark Quote Sent"}
                </Button>
              </form>
            </div>

            <div className="rounded-xl border border-border/70 bg-muted/30 p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Quote Follow-up</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Manual log for the SMS or email nurture message after the quote goes out.
                  </p>
                </div>
                <Badge
                  variant={
                    job.quote_followup_sent_at
                      ? "completed"
                      : job.quote_followup_processing
                        ? "scheduled"
                      : !quoteSentLogged
                        ? "outline"
                      : quoteFollowupIsDue
                        ? "destructive"
                        : "outline"
                  }
                >
                  {job.quote_followup_sent_at
                    ? "Logged"
                    : job.quote_followup_processing
                      ? "Sending"
                    : !quoteSentLogged
                      ? "Waiting"
                      : quoteFollowupIsDue
                      ? "Due"
                      : "Queued"}
                </Badge>
              </div>

              <div className="space-y-1 text-sm text-muted-foreground">
                <p>{formatAutomationTimestamp(job.quote_followup_sent_at)}</p>
                {quoteSentLogged ? (
                  <p>
                    {businessProfile?.quote_followup_enabled
                      ? `Queue target: ${formatAutomationTimestamp(quoteFollowupDueAt)}`
                      : `Workflow disabled in settings. Current timer remains ${quoteFollowupDelayHours} hours.`}
                  </p>
                ) : (
                  <p>Log the quote first to arm the follow-up queue.</p>
                )}
                {job.quote_followup_last_error ? (
                  <p className="text-destructive">
                    Last automation error: {job.quote_followup_last_error}
                  </p>
                ) : null}
              </div>

              <form action={toggleQuoteFollowupSentAction}>
                <Button
                  type="submit"
                  size="sm"
                  variant={job.quote_followup_sent_at ? "outline" : "default"}
                  disabled={!quoteSentLogged || job.quote_followup_processing}
                >
                  {job.quote_followup_sent_at
                    ? "Clear Follow-up Timestamp"
                    : "Mark Follow-up Sent"}
                </Button>
              </form>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Job Photos Section */}
      <Card className="shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ animationDelay: '400ms', animationFillMode: 'backwards' }}>
        <CardHeader>
          <CardTitle>Before & After Photos</CardTitle>
        </CardHeader>
        <CardContent>
          <JobPhotos jobId={id} userId={user.id} initialPhotos={photos} />
        </CardContent>
      </Card>
    </div>
  );
}
