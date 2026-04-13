import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DispatchBoard } from "@/components/dashboard/dispatch-board";
import { CrewLoadboard } from "@/components/dashboard/crew-loadboard";
import { DispatchDaySheet } from "@/components/dashboard/dispatch-day-sheet";
import { DispatchRoutePlanner } from "@/components/dashboard/dispatch-route-planner";
import { PrintButton } from "@/components/print-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectItem } from "@/components/ui/select";
import { buildDispatchRoutePlannerData } from "@/lib/dispatch-route";
import { DispatchQueueList } from "./dispatch-queue-list";

type DispatchDeskJob = {
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

function parseDate(value?: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toIsoDate(value: Date) {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeSearchParam(
  value?: string | string[] | undefined,
) {
  if (Array.isArray(value)) {
    return value[0] || "";
  }

  return value || "";
}

interface DispatchPageProps {
  searchParams?: Promise<{
    crew?: string | string[];
    date?: string | string[];
  }>;
}

export default async function DispatchPage({ searchParams }: DispatchPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const [jobsResult, businessProfileResult] = await Promise.all([
    supabase
      .from("jobs")
      .select(`
        id,
        title,
        description,
        status,
        start_date,
        dispatch_check_in_status,
        dispatch_eta_note,
        dispatch_last_checked_in_at,
        dispatch_last_known_location,
        dispatch_geo_latitude,
        dispatch_geo_longitude,
        dispatch_geo_accuracy_meters,
        dispatch_geo_captured_at,
        dispatch_share_token,
        dispatch_share_enabled,
        dispatch_sequence,
        dispatch_priority,
        service_window,
        assigned_technician,
        trade_vertical,
        site_access_notes,
        clients:client_id (
          name,
          address,
          phone,
          email
        )
      `)
      .eq("user_id", user.id)
      .not("status", "in", '("completed","cancelled")')
      .order("start_date", { ascending: true })
      .order("created_at", { ascending: false }),
    supabase
      .from("business_profile")
      .select("business_name, dispatch_roster")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (jobsResult.error) {
    throw jobsResult.error;
  }

  if (businessProfileResult.error) {
    throw businessProfileResult.error;
  }

  const dispatchJobs = (jobsResult.data || []) as unknown as DispatchDeskJob[];
  const dispatchRoster = businessProfileResult.data?.dispatch_roster || [];
  const businessName = businessProfileResult.data?.business_name || null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const defaultSheetDate = toIsoDate(today);
  const selectedCrew = normalizeSearchParam(resolvedSearchParams?.crew).trim();
  const selectedDate =
    normalizeSearchParam(resolvedSearchParams?.date).trim() || defaultSheetDate;
  const crewOptions = Array.from(
    new Set(
      [
        ...dispatchRoster,
        ...dispatchJobs
          .map((job) => job.assigned_technician?.trim())
          .filter((value): value is string => Boolean(value)),
      ].filter(Boolean),
    ),
  );

  const urgentCount = dispatchJobs.filter((job) =>
    ["emergency", "same_day"].includes(job.dispatch_priority || ""),
  ).length;
  const todayCount = dispatchJobs.filter((job) => {
    const date = parseDate(job.start_date);
    return (
      date?.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  }).length;
  const unassignedCount = dispatchJobs.filter(
    (job) => !job.assigned_technician?.trim(),
  ).length;
  const afterHoursCount = dispatchJobs.filter(
    (job) => job.service_window === "after_hours",
  ).length;
  const sheetJobs = dispatchJobs.filter((job) => {
    const matchesCrew = selectedCrew
      ? selectedCrew === "Unassigned"
        ? !job.assigned_technician?.trim()
        : job.assigned_technician?.trim() === selectedCrew
      : true;

    const matchesDate = selectedDate ? job.start_date === selectedDate : true;
    return matchesCrew && matchesDate;
  }).sort((left, right) => {
    const leftSequence = left.dispatch_sequence ?? Number.MAX_SAFE_INTEGER;
    const rightSequence = right.dispatch_sequence ?? Number.MAX_SAFE_INTEGER;

    if (leftSequence !== rightSequence) {
      return leftSequence - rightSequence;
    }

    const leftPriority = ["emergency", "same_day", "scheduled", "backlog"].indexOf(
      left.dispatch_priority || "",
    );
    const rightPriority = ["emergency", "same_day", "scheduled", "backlog"].indexOf(
      right.dispatch_priority || "",
    );

    if (leftPriority !== rightPriority) {
      return (leftPriority === -1 ? 99 : leftPriority) - (rightPriority === -1 ? 99 : rightPriority);
    }

    return left.title.localeCompare(right.title);
  });
  const routePlannerData = buildDispatchRoutePlannerData(sheetJobs);

  return (
    <div className="space-y-6 md:space-y-8">
      <div
        className="animate-in fade-in slide-in-from-top-4 duration-700 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
        data-print-hidden="true"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Dispatch
          </h1>
          <p className="mt-1 text-sm md:text-base text-muted-foreground">
            Crew assignment, run-sheet control, and job-state updates from one desk.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/dashboard/jobs"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Open Jobs
          </Link>
          <Link
            href="/dashboard/settings"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            Review Dispatch Profile
          </Link>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 xl:grid-cols-4" data-print-hidden="true">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Emergency / Same Day
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{urgentCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Scheduled Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{todayCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Unassigned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{unassignedCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              After Hours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{afterHoursCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70 bg-muted/20" data-print-hidden="true">
        <CardContent className="flex flex-col gap-3 py-5 text-sm text-muted-foreground lg:flex-row lg:items-center lg:justify-between">
          <p>
            This desk handles crew assignment, dates, job-state movement, and crew-submitted
            check-ins. GPS is captured when a technician shares their browser location from the field link.
          </p>
          <Link
            href="/dashboard/jobs"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Create or Edit Full Job
          </Link>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <Card data-print-hidden="true">
          <CardHeader>
            <CardTitle>Dispatch Day Sheet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Filter the run sheet by date and crew, then print a paper handoff pack
              with each job&apos;s dispatch brief for the van.
            </p>

            <form method="get" className="grid gap-4 md:grid-cols-[1fr_1fr_auto_auto] md:items-end">
              <div className="space-y-2">
                <Label htmlFor="date">Sheet Date</Label>
                <Input id="date" name="date" type="date" defaultValue={selectedDate} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="crew">Crew Lane</Label>
                <Select id="crew" name="crew" defaultValue={selectedCrew}>
                  <SelectItem value="">All crews</SelectItem>
                  {crewOptions.map((crew) => (
                    <SelectItem key={crew} value={crew}>
                      {crew}
                    </SelectItem>
                  ))}
                  <SelectItem value="Unassigned">Unassigned</SelectItem>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className={buttonVariants({ size: "sm" })}
                >
                  Update Sheet
                </button>
                <Link
                  href="/dashboard/dispatch"
                  className={buttonVariants({ variant: "ghost", size: "sm" })}
                >
                  Reset
                </Link>
              </div>

              <div className="flex justify-start md:justify-end">
                <PrintButton label="Print Sheet" />
              </div>
            </form>
          </CardContent>
        </Card>

        <DispatchRoutePlanner
          routeReadyCount={routePlannerData.routeReadyCount}
          missingAddressCount={routePlannerData.missingAddressCount}
          routePacks={routePlannerData.routePacks}
          selectedCrew={selectedCrew}
          selectedDate={selectedDate}
        />

        <DispatchDaySheet
          businessName={businessName}
          jobs={sheetJobs}
          selectedDate={selectedDate}
          selectedCrew={selectedCrew}
        />
      </section>

      <div data-print-hidden="true">
        <DispatchBoard
          jobs={dispatchJobs}
          title="Dispatch Board"
          description="Operational view of urgent work, today&apos;s run sheet, upcoming visits, and unscheduled backlog."
        />
      </div>

      <div data-print-hidden="true">
        <CrewLoadboard
          jobs={dispatchJobs}
          dispatchRoster={dispatchRoster}
          title="Crew Loadboard"
          description="Balance active work across saved crews, spot overloaded lanes, and see who is still carrying urgent callouts."
        />
      </div>

      <div data-print-hidden="true">
        <DispatchQueueList jobs={dispatchJobs} dispatchRoster={dispatchRoster} />
      </div>
    </div>
  );
}
