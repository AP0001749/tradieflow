"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CalendarDays, Clock3, MapPinned, UserRound, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectItem } from "@/components/ui/select";
import { DispatchBriefActions } from "@/components/dashboard/dispatch-brief-actions";
import {
  DISPATCH_CHECK_IN_OPTIONS,
  formatDispatchCheckInTimestamp,
  getDispatchCheckInLabel,
  getDispatchCheckInVariant,
} from "@/lib/dispatch-check-in";
import { formatDispatchBrief } from "@/lib/dispatch-brief";
import {
  buildDispatchGeoMapUrl,
  formatDispatchGeoAccuracy,
  formatDispatchGeoPoint,
} from "@/lib/dispatch-geo";
import { buildGoogleMapsSearchUrl } from "@/lib/dispatch-route";
import {
  DISPATCH_PRIORITY_OPTIONS,
  SERVICE_WINDOW_OPTIONS,
  getDispatchPriorityLabel,
  getDispatchPriorityVariant,
  getServiceWindowLabel,
  getDispatchPrioritySortRank,
} from "@/lib/job-dispatch";
import { getTradeVerticalLabel } from "@/lib/trade-jobs";
import { updateJobDispatchQuick } from "../jobs/actions";

type DispatchQueueJob = {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  start_date: string | null;
  dispatch_check_in_status: string | null;
  dispatch_eta_note: string | null;
  dispatch_last_checked_in_at: string | null;
  dispatch_last_known_location: string | null;
  dispatch_geo_latitude: number | null;
  dispatch_geo_longitude: number | null;
  dispatch_geo_accuracy_meters: number | null;
  dispatch_geo_captured_at: string | null;
  dispatch_share_token: string | null;
  dispatch_share_enabled: boolean | null;
  dispatch_sequence: number | null;
  dispatch_priority: string | null;
  service_window: string | null;
  assigned_technician: string | null;
  trade_vertical: string | null;
  site_access_notes: string | null;
  clients: {
    name: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
  } | null;
};

interface DispatchQueueListProps {
  jobs: DispatchQueueJob[];
  dispatchRoster: string[];
}

function formatStatusLabel(status?: string | null) {
  return (status || "draft").replaceAll("_", " ");
}

function sortJobs(jobs: DispatchQueueJob[]) {
  return [...jobs].sort((left, right) => {
    const priorityDelta =
      getDispatchPrioritySortRank(left.dispatch_priority) -
      getDispatchPrioritySortRank(right.dispatch_priority);

    if (priorityDelta !== 0) {
      return priorityDelta;
    }

    const leftDate = left.start_date
      ? new Date(`${left.start_date}T00:00:00`).getTime()
      : Number.MAX_SAFE_INTEGER;
    const rightDate = right.start_date
      ? new Date(`${right.start_date}T00:00:00`).getTime()
      : Number.MAX_SAFE_INTEGER;

    if (leftDate !== rightDate) {
      return leftDate - rightDate;
    }

    const leftSequence = left.dispatch_sequence ?? Number.MAX_SAFE_INTEGER;
    const rightSequence = right.dispatch_sequence ?? Number.MAX_SAFE_INTEGER;

    if (leftSequence !== rightSequence) {
      return leftSequence - rightSequence;
    }

    return left.title.localeCompare(right.title);
  });
}

function DispatchQueueItem({
  job,
  dispatchRoster,
}: {
  job: DispatchQueueJob;
  dispatchRoster: string[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [assignedTechnician, setAssignedTechnician] = useState(
    job.assigned_technician || "",
  );
  const [startDate, setStartDate] = useState(job.start_date || "");
  const [checkInStatus, setCheckInStatus] = useState(
    job.dispatch_check_in_status || "awaiting_dispatch",
  );
  const [dispatchEtaNote, setDispatchEtaNote] = useState(job.dispatch_eta_note || "");
  const [lastKnownLocation, setLastKnownLocation] = useState(
    job.dispatch_last_known_location || "",
  );
  const [dispatchSequence, setDispatchSequence] = useState(
    job.dispatch_sequence ? String(job.dispatch_sequence) : "",
  );
  const [dispatchPriority, setDispatchPriority] = useState(
    job.dispatch_priority || "scheduled",
  );
  const [serviceWindow, setServiceWindow] = useState(
    job.service_window || "anytime",
  );
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
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
  const siteMapUrl = job.clients?.address
    ? buildGoogleMapsSearchUrl(job.clients.address)
    : null;
  const gpsPoint = formatDispatchGeoPoint(
    job.dispatch_geo_latitude,
    job.dispatch_geo_longitude,
  );
  const gpsMapUrl = buildDispatchGeoMapUrl(
    job.dispatch_geo_latitude,
    job.dispatch_geo_longitude,
  );
  const gpsAccuracy = formatDispatchGeoAccuracy(job.dispatch_geo_accuracy_meters);
  const fieldCheckInHref =
    job.dispatch_share_token && job.dispatch_share_enabled !== false
      ? `/field/${job.dispatch_share_token}`
      : null;

  function runUpdate(statusOverride?: string) {
    setMessage(null);

    startTransition(async () => {
      const result = await updateJobDispatchQuick(job.id, {
        status: statusOverride,
        start_date: startDate || null,
        dispatch_sequence: dispatchSequence.trim()
          ? Number(dispatchSequence)
          : null,
        dispatch_check_in_status: checkInStatus || null,
        dispatch_last_known_location: lastKnownLocation || null,
        dispatch_eta_note: dispatchEtaNote || null,
        dispatch_priority: dispatchPriority || null,
        service_window: serviceWindow || null,
        assigned_technician: assignedTechnician || null,
      });

      if (result.error) {
        setMessage({ type: "error", text: result.error });
        return;
      }

      setMessage({
        type: "success",
        text: statusOverride
          ? `Job moved to ${formatStatusLabel(statusOverride)}.`
          : "Dispatch details saved.",
      });
      router.refresh();
    });
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">{job.title}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {job.clients?.name || "Client not linked"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={getDispatchPriorityVariant(job.dispatch_priority)}>
              {getDispatchPriorityLabel(job.dispatch_priority)}
            </Badge>
            <Badge variant={getDispatchCheckInVariant(job.dispatch_check_in_status)}>
              {getDispatchCheckInLabel(job.dispatch_check_in_status)}
            </Badge>
            <Badge variant="outline" className="capitalize">
              {formatStatusLabel(job.status)}
            </Badge>
          </div>
        </div>

        <div className="grid gap-3 text-sm text-muted-foreground md:grid-cols-2 xl:grid-cols-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            <span>
              {job.start_date
                ? new Date(`${job.start_date}T00:00:00`).toLocaleDateString("en-AU")
                : "Not scheduled"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock3 className="h-4 w-4" />
            <span>{getServiceWindowLabel(job.service_window)}</span>
          </div>
          <div className="flex items-center gap-2">
            <UserRound className="h-4 w-4" />
            <span>{job.assigned_technician || "Unassigned crew"}</span>
          </div>
          <div className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            <span>{getTradeVerticalLabel(job.trade_vertical)}</span>
          </div>
        </div>

        <div className="text-sm text-muted-foreground">
          Run order: {job.dispatch_sequence ? `#${job.dispatch_sequence}` : "Auto"}
        </div>

        <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-3">
          <div>
            <span className="font-medium text-foreground">Crew status:</span>{" "}
            {getDispatchCheckInLabel(job.dispatch_check_in_status)}
          </div>
          <div>
            <span className="font-medium text-foreground">ETA:</span>{" "}
            {job.dispatch_eta_note || "Not logged"}
          </div>
          <div>
            <span className="font-medium text-foreground">Last update:</span>{" "}
            {formatDispatchCheckInTimestamp(job.dispatch_last_checked_in_at)}
          </div>
          <div>
            <span className="font-medium text-foreground">GPS:</span>{" "}
            {gpsPoint
              ? `${gpsPoint}${gpsAccuracy ? ` (${gpsAccuracy})` : ""}`
              : "Not captured"}
          </div>
        </div>

        <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
          <div className="flex items-start gap-2">
            <MapPinned className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {job.clients?.address || "No client address on file"}
              {job.dispatch_last_known_location ? (
                <>
                  {" | "}Last known: {job.dispatch_last_known_location}
                </>
              ) : null}
            </span>
          </div>
          <div>
            <span className="font-medium text-foreground">Site access:</span>{" "}
            {job.site_access_notes || "No site access notes recorded"}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-7">
          <div className="space-y-2">
            <Label htmlFor={`dispatch_sequence_${job.id}`}>Run Order</Label>
            <Input
              id={`dispatch_sequence_${job.id}`}
              type="number"
              min={1}
              step={1}
              value={dispatchSequence}
              onChange={(event) => setDispatchSequence(event.target.value)}
              placeholder="1"
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`dispatch_check_in_status_${job.id}`}>Crew Check-In</Label>
            <Select
              id={`dispatch_check_in_status_${job.id}`}
              value={checkInStatus}
              onChange={(event) => setCheckInStatus(event.target.value)}
              disabled={isPending}
            >
              {DISPATCH_CHECK_IN_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`assigned_technician_${job.id}`}>Assigned Tech / Crew</Label>
            <Input
              id={`assigned_technician_${job.id}`}
              list={`dispatch-roster-dispatch-${job.id}`}
              value={assignedTechnician}
              onChange={(event) => setAssignedTechnician(event.target.value)}
              placeholder="Sam, Van 2, or after-hours roster"
              disabled={isPending}
            />
            <datalist id={`dispatch-roster-dispatch-${job.id}`}>
              {dispatchRoster.map((entry) => (
                <option key={entry} value={entry} />
              ))}
            </datalist>
            {dispatchRoster.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {dispatchRoster.slice(0, 8).map((entry) => (
                  <button
                    key={entry}
                    type="button"
                    className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    onClick={() => setAssignedTechnician(entry)}
                    disabled={isPending}
                  >
                    {entry}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor={`dispatch_eta_note_${job.id}`}>ETA / Arrival Note</Label>
            <Input
              id={`dispatch_eta_note_${job.id}`}
              value={dispatchEtaNote}
              onChange={(event) => setDispatchEtaNote(event.target.value)}
              placeholder="e.g. 20 mins out"
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`dispatch_last_known_location_${job.id}`}>Last Known Location</Label>
            <Input
              id={`dispatch_last_known_location_${job.id}`}
              value={lastKnownLocation}
              onChange={(event) => setLastKnownLocation(event.target.value)}
              placeholder="e.g. Princes Fwy inbound"
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`start_date_${job.id}`}>Dispatch Date</Label>
            <Input
              id={`start_date_${job.id}`}
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`dispatch_priority_${job.id}`}>Priority</Label>
            <Select
              id={`dispatch_priority_${job.id}`}
              value={dispatchPriority}
              onChange={(event) => setDispatchPriority(event.target.value)}
              disabled={isPending}
            >
              {DISPATCH_PRIORITY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`service_window_${job.id}`}>Service Window</Label>
            <Select
              id={`service_window_${job.id}`}
              value={serviceWindow}
              onChange={(event) => setServiceWindow(event.target.value)}
              disabled={isPending}
            >
              {SERVICE_WINDOW_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </Select>
          </div>
        </div>

        {message ? (
          <div
            className={
              message.type === "success"
                ? "rounded-md border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300"
                : "rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            }
          >
            {message.text}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => runUpdate()}
            disabled={isPending}
          >
            {isPending ? "Saving..." : "Save Dispatch"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => runUpdate("scheduled")}
            disabled={isPending}
          >
            Queue Job
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => runUpdate("in_progress")}
            disabled={isPending}
          >
            Start Job
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => runUpdate("completed")}
            disabled={isPending}
          >
            Complete Job
          </Button>
          <DispatchBriefActions
            briefText={dispatchBrief}
            phone={job.clients?.phone}
            email={job.clients?.email}
            compact
          />
          {siteMapUrl ? (
            <a
              href={siteMapUrl}
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              Open Map
            </a>
          ) : null}
          {gpsMapUrl ? (
            <a
              href={gpsMapUrl}
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              Open GPS
            </a>
          ) : null}
          {fieldCheckInHref ? (
            <Link
              href={fieldCheckInHref}
              target="_blank"
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              Crew Link
            </Link>
          ) : null}
          <Link
            href={`/dashboard/jobs/${job.id}`}
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            Open Full Job
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export function DispatchQueueList({
  jobs,
  dispatchRoster,
}: DispatchQueueListProps) {
  const sortedJobs = sortJobs(jobs);

  if (sortedJobs.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Dispatch Control Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No active jobs yet. Create work from the Jobs page to start routing crews
            through the dispatch desk.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Dispatch Control Queue</h2>
        <p className="text-sm text-muted-foreground">
          Assign crews, adjust service windows, and move jobs through the field
          workflow without opening the full edit dialog.
        </p>
      </div>

      <div className="space-y-4">
        {sortedJobs.map((job) => (
          <DispatchQueueItem
            key={job.id}
            job={job}
            dispatchRoster={dispatchRoster}
          />
        ))}
      </div>
    </div>
  );
}
