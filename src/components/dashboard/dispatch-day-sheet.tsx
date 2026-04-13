import { CalendarDays, MapPinned, Phone, UserRound, Wrench } from "lucide-react";
import { formatDispatchBrief } from "@/lib/dispatch-brief";

type DispatchDaySheetJob = {
  id: string;
  title: string;
  description: string | null;
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
  site_access_notes: string | null;
  clients: {
    name: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
  } | null;
};

interface DispatchDaySheetProps {
  businessName?: string | null;
  jobs: DispatchDaySheetJob[];
  selectedDate: string;
  selectedCrew?: string;
}

function formatSheetDate(value: string) {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function sortSheetJobs(left: DispatchDaySheetJob, right: DispatchDaySheetJob) {
  const leftSequence = left.dispatch_sequence ?? Number.MAX_SAFE_INTEGER;
  const rightSequence = right.dispatch_sequence ?? Number.MAX_SAFE_INTEGER;

  if (leftSequence !== rightSequence) {
    return leftSequence - rightSequence;
  }

  return left.title.localeCompare(right.title);
}

export function DispatchDaySheet({
  businessName,
  jobs,
  selectedDate,
  selectedCrew,
}: DispatchDaySheetProps) {
  const formattedDate = formatSheetDate(selectedDate);
  const crewLabel = selectedCrew?.trim() ? selectedCrew : "All crews";
  const sortedJobs = [...jobs].sort(sortSheetJobs);

  return (
    <div className="print-paper mx-auto rounded-xl border shadow-sm p-8 max-w-[210mm] min-h-[297mm] bg-[hsl(var(--paper))] text-[hsl(var(--paper-foreground))] border-[hsl(var(--paper-border))] print:rounded-none">
      <div className="flex items-start justify-between gap-6">
        <div>
          <div className="text-2xl font-bold">
            {businessName || "TradieFlow Dispatch"}
          </div>
          <div className="mt-2 text-sm text-[hsl(var(--paper-muted-foreground))]">
            Dispatch day sheet for {formattedDate}
          </div>
          <div className="text-sm text-[hsl(var(--paper-muted-foreground))]">
            Crew lane: {crewLabel}
          </div>
        </div>

        <div className="text-right">
          <div className="text-3xl font-extrabold tracking-wide">RUN SHEET</div>
          <div className="mt-2 text-sm text-[hsl(var(--paper-muted-foreground))]">
            <div>
              <span className="font-medium">Jobs</span> {sortedJobs.length}
            </div>
            <div>
              <span className="font-medium">Printed</span>{" "}
              {new Date().toLocaleDateString("en-AU")}
            </div>
          </div>
        </div>
      </div>

      <div className="my-6 h-px bg-[hsl(var(--paper-border))]" />

      {sortedJobs.length > 0 ? (
        <div className="space-y-6">
          {sortedJobs.map((job, index) => {
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

            return (
              <div
                key={job.id}
                className="space-y-4"
                style={{
                  pageBreakInside: "avoid",
                  breakInside: "avoid",
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-lg font-semibold">
                      {index + 1}. {job.title}
                    </div>
                    <div className="mt-1 text-sm text-[hsl(var(--paper-muted-foreground))]">
                      {job.clients?.name || "Client not linked"}
                    </div>
                    <div className="mt-1 text-xs text-[hsl(var(--paper-muted-foreground))]">
                      Run order: {job.dispatch_sequence ? `#${job.dispatch_sequence}` : "Auto"}
                    </div>
                  </div>
                  <div className="rounded-full border border-[hsl(var(--paper-border))] px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-[hsl(var(--paper-muted-foreground))]">
                    {(job.dispatch_priority || "scheduled").replaceAll("_", " ")}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-xl border border-[hsl(var(--paper-border))] bg-[hsl(var(--paper-muted))] p-3">
                    <div className="inline-flex items-center gap-2 text-sm font-medium">
                      <CalendarDays className="h-4 w-4" />
                      {formattedDate}
                    </div>
                    <div className="mt-1 text-sm text-[hsl(var(--paper-muted-foreground))]">
                      {(job.service_window || "anytime").replaceAll("_", " ")}
                    </div>
                  </div>

                  <div className="rounded-xl border border-[hsl(var(--paper-border))] bg-[hsl(var(--paper-muted))] p-3">
                    <div className="inline-flex items-center gap-2 text-sm font-medium">
                      <UserRound className="h-4 w-4" />
                      {job.assigned_technician || "Unassigned"}
                    </div>
                    <div className="mt-1 text-sm text-[hsl(var(--paper-muted-foreground))]">
                      Crew / technician
                    </div>
                  </div>

                  <div className="rounded-xl border border-[hsl(var(--paper-border))] bg-[hsl(var(--paper-muted))] p-3">
                    <div className="inline-flex items-center gap-2 text-sm font-medium">
                      <Wrench className="h-4 w-4" />
                      {(job.trade_vertical || "mixed_trade").replaceAll("_", " ")}
                    </div>
                    <div className="mt-1 text-sm text-[hsl(var(--paper-muted-foreground))]">
                      Trade type
                    </div>
                  </div>

                  <div className="rounded-xl border border-[hsl(var(--paper-border))] bg-[hsl(var(--paper-muted))] p-3">
                    <div className="inline-flex items-center gap-2 text-sm font-medium">
                      <Phone className="h-4 w-4" />
                      {job.clients?.phone || "No phone"}
                    </div>
                    <div className="mt-1 text-sm text-[hsl(var(--paper-muted-foreground))]">
                      Customer contact
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-[hsl(var(--paper-border))] p-4">
                  <div className="inline-flex items-center gap-2 text-sm font-medium">
                    <MapPinned className="h-4 w-4" />
                    Site address
                  </div>
                  <div className="mt-1 text-sm text-[hsl(var(--paper-muted-foreground))]">
                    {job.clients?.address || "No site address on file"}
                  </div>
                </div>

                <div className="rounded-xl border border-[hsl(var(--paper-border))] p-4">
                  <div className="text-sm font-medium">Dispatch brief</div>
                  <pre className="mt-3 whitespace-pre-wrap text-sm text-[hsl(var(--paper-foreground))]">
                    {dispatchBrief}
                  </pre>
                </div>

                {index < sortedJobs.length - 1 ? (
                  <div className="h-px bg-[hsl(var(--paper-border))]" />
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-[hsl(var(--paper-border))] p-8 text-center text-sm text-[hsl(var(--paper-muted-foreground))]">
          No jobs matched the selected crew and date.
        </div>
      )}
    </div>
  );
}
