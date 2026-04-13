import Link from "next/link";
import { AlertTriangle, CalendarDays, Clock3, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { getDispatchCheckInLabel, getDispatchCheckInVariant } from "@/lib/dispatch-check-in";
import {
  buildDispatchGeoMapUrl,
  formatDispatchGeoAccuracy,
  formatDispatchGeoPoint,
} from "@/lib/dispatch-geo";
import {
  getDispatchPriorityLabel,
  getDispatchPrioritySortRank,
  getDispatchPriorityVariant,
} from "@/lib/job-dispatch";
import { cn } from "@/lib/utils";

type CrewLoadboardJob = {
  id: string;
  title: string;
  status: string | null;
  start_date: string | null;
  dispatch_check_in_status: string | null;
  dispatch_eta_note: string | null;
  dispatch_last_known_location: string | null;
  dispatch_geo_latitude?: number | null;
  dispatch_geo_longitude?: number | null;
  dispatch_geo_accuracy_meters?: number | null;
  dispatch_geo_captured_at?: string | null;
  dispatch_sequence: number | null;
  dispatch_priority: string | null;
  service_window: string | null;
  assigned_technician: string | null;
  clients: {
    name: string | null;
  } | null;
};

interface CrewLoadboardProps {
  jobs: CrewLoadboardJob[];
  dispatchRoster?: string[] | null;
  title?: string;
  description?: string;
  maxJobsPerCrew?: number;
  compact?: boolean;
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

function sortCrewJobs(left: CrewLoadboardJob, right: CrewLoadboardJob) {
  const priorityDelta =
    getDispatchPrioritySortRank(left.dispatch_priority) -
    getDispatchPrioritySortRank(right.dispatch_priority);

  if (priorityDelta !== 0) {
    return priorityDelta;
  }

  const leftDate = parseJobDate(left.start_date)?.getTime() ?? Number.MAX_SAFE_INTEGER;
  const rightDate = parseJobDate(right.start_date)?.getTime() ?? Number.MAX_SAFE_INTEGER;

  if (leftDate !== rightDate) {
    return leftDate - rightDate;
  }

  const leftSequence = left.dispatch_sequence ?? Number.MAX_SAFE_INTEGER;
  const rightSequence = right.dispatch_sequence ?? Number.MAX_SAFE_INTEGER;

  if (leftSequence !== rightSequence) {
    return leftSequence - rightSequence;
  }

  return left.title.localeCompare(right.title);
}

function formatDateLabel(value?: string | null) {
  const parsed = parseJobDate(value);
  return parsed ? parsed.toLocaleDateString("en-AU") : "No date";
}

function buildCrewGroups(
  jobs: CrewLoadboardJob[],
  dispatchRoster?: string[] | null,
) {
  const groups = new Map<string, CrewLoadboardJob[]>();
  const roster = dispatchRoster || [];

  for (const crew of roster) {
    groups.set(crew, []);
  }

  for (const job of jobs) {
    const crew = job.assigned_technician?.trim() || "Unassigned";
    const existing = groups.get(crew);
    if (existing) {
      existing.push(job);
    } else {
      groups.set(crew, [job]);
    }
  }

  if (!groups.has("Unassigned")) {
    groups.set("Unassigned", []);
  }

  const rosterSet = new Set(roster);
  const groupNames = [
    ...roster,
    ...Array.from(groups.keys()).filter(
      (name) => name !== "Unassigned" && !rosterSet.has(name),
    ),
    "Unassigned",
  ];

  return groupNames
    .filter((name, index) => groupNames.indexOf(name) === index)
    .map((name) => ({
      name,
      jobs: [...(groups.get(name) || [])].sort(sortCrewJobs),
    }));
}

function CrewJobCard({ job }: { job: CrewLoadboardJob }) {
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
    <div className="rounded-xl border border-border/70 bg-background/70 p-3 space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
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
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays className="h-4 w-4" />
          {formatDateLabel(job.start_date)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock3 className="h-4 w-4" />
          {(job.service_window || "anytime").replaceAll("_", " ")}
        </span>
        <span>Run {job.dispatch_sequence ? `#${job.dispatch_sequence}` : "auto"}</span>
      </div>

      <div className="text-sm text-muted-foreground">
        <p>ETA: {job.dispatch_eta_note || "Not logged"}</p>
        {job.dispatch_last_known_location ? (
          <p>Last known: {job.dispatch_last_known_location}</p>
        ) : null}
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
  );
}

function CrewCard({
  crewName,
  jobs,
  maxJobsPerCrew,
  compact,
}: {
  crewName: string;
  jobs: CrewLoadboardJob[];
  maxJobsPerCrew?: number;
  compact?: boolean;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const urgentCount = jobs.filter((job) =>
    ["emergency", "same_day"].includes(job.dispatch_priority || ""),
  ).length;
  const todayCount = jobs.filter((job) =>
    isSameDay(parseJobDate(job.start_date), today),
  ).length;
  const afterHoursCount = jobs.filter(
    (job) => job.service_window === "after_hours",
  ).length;
  const visibleJobs =
    typeof maxJobsPerCrew === "number" ? jobs.slice(0, maxJobsPerCrew) : jobs;

  return (
    <Card className="shadow-sm">
      <CardHeader className={cn("space-y-3", compact ? "pb-3" : "pb-4")}>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">{crewName}</CardTitle>
              {crewName === "Unassigned" ? (
                <Badge variant="outline">Needs routing</Badge>
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground">
              {jobs.length > 0
                ? `${jobs.length} active job${jobs.length === 1 ? "" : "s"}`
                : "No active jobs assigned right now"}
            </p>
          </div>

          <div className="rounded-full border border-border/70 px-3 py-1 text-xs font-medium text-muted-foreground">
            {jobs.length}
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl border border-border/70 bg-muted/25 p-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              Urgent
            </p>
            <p className="mt-1 text-lg font-semibold">{urgentCount}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-muted/25 p-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              Today
            </p>
            <p className="mt-1 text-lg font-semibold">{todayCount}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-muted/25 p-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              After Hours
            </p>
            <p className="mt-1 text-lg font-semibold">{afterHoursCount}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {visibleJobs.length > 0 ? (
          visibleJobs.map((job) => (
            <CrewJobCard key={job.id} job={job} />
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-5 text-sm text-muted-foreground">
            {crewName === "Unassigned"
              ? "Every active job has a crew assigned."
              : "This crew has no active jobs right now."}
          </div>
        )}

        {typeof maxJobsPerCrew === "number" && jobs.length > visibleJobs.length ? (
          <p className="text-sm text-muted-foreground">
            Showing {visibleJobs.length} of {jobs.length} jobs for {crewName}.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function CrewLoadboard({
  jobs,
  dispatchRoster,
  title = "Crew Loadboard",
  description = "See which crews are carrying urgent work, how full today looks, and where jobs still need routing.",
  maxJobsPerCrew,
  compact,
}: CrewLoadboardProps) {
  const activeJobs = jobs.filter(
    (job) => !["completed", "cancelled"].includes(job.status || ""),
  );
  const groups = buildCrewGroups(activeJobs, dispatchRoster);
  const urgentUnassignedCount = activeJobs.filter(
    (job) =>
      !job.assigned_technician?.trim() &&
      ["emergency", "same_day"].includes(job.dispatch_priority || ""),
  ).length;

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className={cn("font-semibold", compact ? "text-lg" : "text-xl")}>
            {title}
          </h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={urgentUnassignedCount > 0 ? "destructive" : "outline"}>
            <AlertTriangle className="mr-1 h-3.5 w-3.5" />
            Urgent unassigned {urgentUnassignedCount}
          </Badge>
          <Badge variant="outline">
            <UserRound className="mr-1 h-3.5 w-3.5" />
            Crew lanes {groups.length}
          </Badge>
        </div>
      </div>

      <div className={cn("grid gap-4", compact ? "xl:grid-cols-2" : "xl:grid-cols-3")}>
        {groups.map((group) => (
          <CrewCard
            key={group.name}
            crewName={group.name}
            jobs={group.jobs}
            maxJobsPerCrew={maxJobsPerCrew}
            compact={compact}
          />
        ))}
      </div>
    </section>
  );
}
