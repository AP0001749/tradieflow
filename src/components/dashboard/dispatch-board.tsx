import Link from "next/link";
import { CalendarDays, MapPinned, UserRound, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import {
  formatDispatchCheckInTimestamp,
  getDispatchCheckInLabel,
  getDispatchCheckInVariant,
} from "@/lib/dispatch-check-in";
import {
  buildDispatchGeoMapUrl,
  formatDispatchGeoAccuracy,
  formatDispatchGeoPoint,
} from "@/lib/dispatch-geo";
import { getDispatchPriorityLabel, getDispatchPrioritySortRank, getDispatchPriorityVariant, getServiceWindowLabel } from "@/lib/job-dispatch";
import { getTradeVerticalLabel } from "@/lib/trade-jobs";

type DispatchBoardJob = {
  id: string;
  title: string;
  status: string | null;
  start_date: string | null;
  dispatch_check_in_status: string | null;
  dispatch_eta_note: string | null;
  dispatch_last_checked_in_at: string | null;
  dispatch_last_known_location: string | null;
  dispatch_geo_latitude?: number | null;
  dispatch_geo_longitude?: number | null;
  dispatch_geo_accuracy_meters?: number | null;
  dispatch_geo_captured_at?: string | null;
  dispatch_sequence: number | null;
  dispatch_priority: string | null;
  service_window: string | null;
  assigned_technician: string | null;
  trade_vertical: string | null;
  clients: {
    name: string | null;
    address?: string | null;
  } | null;
};

interface DispatchBoardProps {
  jobs: DispatchBoardJob[];
  title?: string;
  description?: string;
  maxItemsPerSection?: number;
}

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function parseJobDate(value?: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isSameDay(left: Date | null, right: Date) {
  return (
    left?.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function sortDispatchJobs(a: DispatchBoardJob, b: DispatchBoardJob) {
  const priorityDelta =
    getDispatchPrioritySortRank(a.dispatch_priority) -
    getDispatchPrioritySortRank(b.dispatch_priority);

  if (priorityDelta !== 0) {
    return priorityDelta;
  }

  const dateA = parseJobDate(a.start_date)?.getTime() ?? Number.MAX_SAFE_INTEGER;
  const dateB = parseJobDate(b.start_date)?.getTime() ?? Number.MAX_SAFE_INTEGER;
  if (dateA !== dateB) {
    return dateA - dateB;
  }

  const sequenceA = a.dispatch_sequence ?? Number.MAX_SAFE_INTEGER;
  const sequenceB = b.dispatch_sequence ?? Number.MAX_SAFE_INTEGER;
  if (sequenceA !== sequenceB) {
    return sequenceA - sequenceB;
  }

  return a.title.localeCompare(b.title);
}

function formatDateLabel(value?: string | null) {
  if (!value) {
    return "Not scheduled";
  }

  const date = parseJobDate(value);
  return date ? date.toLocaleDateString("en-AU") : "Not scheduled";
}

function JobRow({ job }: { job: DispatchBoardJob }) {
  const gpsPoint = formatDispatchGeoPoint(
    job.dispatch_geo_latitude,
    job.dispatch_geo_longitude,
  );
  const gpsMapUrl = buildDispatchGeoMapUrl(
    job.dispatch_geo_latitude,
    job.dispatch_geo_longitude,
  );
  const gpsAccuracy = formatDispatchGeoAccuracy(job.dispatch_geo_accuracy_meters);

  return (
    <div className="rounded-xl border border-border/70 bg-background/60 p-4 space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="font-medium">{job.title}</p>
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
            {(job.status || "draft").replaceAll("_", " ")}
          </Badge>
        </div>
      </div>

      <div className="grid gap-3 text-sm text-muted-foreground md:grid-cols-2 xl:grid-cols-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4" />
          <span>{formatDateLabel(job.start_date)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Wrench className="h-4 w-4" />
          <span>{getTradeVerticalLabel(job.trade_vertical)}</span>
        </div>
        <div className="flex items-center gap-2">
          <UserRound className="h-4 w-4" />
          <span>{job.assigned_technician || "Unassigned crew"}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPinned className="h-4 w-4" />
          <span>{job.clients?.address || "No site address on client record"}</span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          <p>Service window: {getServiceWindowLabel(job.service_window)}</p>
          <p>Run {job.dispatch_sequence ? `#${job.dispatch_sequence}` : "auto"}</p>
          <p>
            ETA: {job.dispatch_eta_note || "Not logged"}
            {job.dispatch_last_known_location ? ` | ${job.dispatch_last_known_location}` : ""}
          </p>
          <p>Last update: {formatDispatchCheckInTimestamp(job.dispatch_last_checked_in_at)}</p>
          <p>
            GPS:{" "}
            {gpsPoint ? (
              gpsMapUrl ? (
                <a
                  href={gpsMapUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline-offset-4 hover:underline"
                >
                  {gpsPoint}
                  {gpsAccuracy ? ` (${gpsAccuracy})` : ""}
                </a>
              ) : (
                `${gpsPoint}${gpsAccuracy ? ` (${gpsAccuracy})` : ""}`
              )
            ) : (
              "Not captured"
            )}
          </p>
        </div>
        <Link
          href={`/dashboard/jobs/${job.id}`}
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          Open Job
        </Link>
      </div>
    </div>
  );
}

function Section({
  title,
  description,
  jobs,
  maxItemsPerSection,
}: {
  title: string;
  description: string;
  jobs: DispatchBoardJob[];
  maxItemsPerSection?: number;
}) {
  const visibleJobs =
    typeof maxItemsPerSection === "number"
      ? jobs.slice(0, maxItemsPerSection)
      : jobs;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-medium">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Badge variant="outline">{jobs.length}</Badge>
      </div>

      {visibleJobs.length > 0 ? (
        <div className="space-y-3">
          {visibleJobs.map((job) => (
            <JobRow key={job.id} job={job} />
          ))}
          {typeof maxItemsPerSection === "number" &&
          jobs.length > visibleJobs.length ? (
            <p className="text-sm text-muted-foreground">
              Showing {visibleJobs.length} of {jobs.length} jobs in this section.
            </p>
          ) : null}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-5 text-sm text-muted-foreground">
          No jobs in this lane yet.
        </div>
      )}
    </div>
  );
}

export function DispatchBoard({
  jobs,
  title = "Dispatch Board",
  description = "Run sheet for urgent callouts, booked visits, and unscheduled work waiting on a slot.",
  maxItemsPerSection,
}: DispatchBoardProps) {
  const today = startOfToday();
  const activeJobs = [...jobs]
    .filter((job) => !["completed", "cancelled"].includes(job.status || ""))
    .sort(sortDispatchJobs);

  const urgentJobs = activeJobs.filter((job) =>
    ["emergency", "same_day"].includes(job.dispatch_priority || ""),
  );
  const urgentIds = new Set(urgentJobs.map((job) => job.id));

  const todaysJobs = activeJobs.filter((job) => {
    if (urgentIds.has(job.id)) {
      return false;
    }

    return isSameDay(parseJobDate(job.start_date), today);
  });

  const upcomingJobs = activeJobs.filter((job) => {
    if (urgentIds.has(job.id)) {
      return false;
    }

    const jobDate = parseJobDate(job.start_date);
    return jobDate ? jobDate.getTime() > today.getTime() : false;
  });

  const unscheduledJobs = activeJobs.filter((job) => !job.start_date);
  const unassignedCount = activeJobs.filter((job) => !job.assigned_technician?.trim()).length;

  return (
    <Card className="shadow-sm">
      <CardHeader className="space-y-4">
        <div>
          <CardTitle>{title}</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-border/70 bg-muted/30 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Emergency / Same Day
            </p>
            <p className="mt-2 text-2xl font-semibold">{urgentJobs.length}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-muted/30 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Today
            </p>
            <p className="mt-2 text-2xl font-semibold">{todaysJobs.length}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-muted/30 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Upcoming
            </p>
            <p className="mt-2 text-2xl font-semibold">{upcomingJobs.length}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-muted/30 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Unassigned
            </p>
            <p className="mt-2 text-2xl font-semibold">{unassignedCount}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <Section
          title="Emergency / Same-Day"
          description="Jobs that should stay at the top of the board until a crew is moving."
          jobs={urgentJobs}
          maxItemsPerSection={maxItemsPerSection}
        />
        <Section
          title="Today's Run Sheet"
          description="Booked work scheduled for today outside the urgent lane."
          jobs={todaysJobs}
          maxItemsPerSection={maxItemsPerSection}
        />
        <Section
          title="Upcoming"
          description="Future visits already booked into the pipeline."
          jobs={upcomingJobs}
          maxItemsPerSection={maxItemsPerSection}
        />
        <Section
          title="Unscheduled / Backlog"
          description="Jobs that still need a promised date or slot."
          jobs={unscheduledJobs}
          maxItemsPerSection={maxItemsPerSection}
        />
      </CardContent>
    </Card>
  );
}
