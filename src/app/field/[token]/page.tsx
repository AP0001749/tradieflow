import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, MapPinned, Phone, UserRound, Wrench } from "lucide-react";

import { FieldCheckInForm } from "./field-check-in-form";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatDispatchCheckInTimestamp,
  getDispatchCheckInLabel,
  getDispatchCheckInVariant,
} from "@/lib/dispatch-check-in";
import {
  buildDispatchGeoMapUrl,
  formatDispatchGeoAccuracy,
  formatDispatchGeoPoint,
  formatDispatchGeoTimestamp,
} from "@/lib/dispatch-geo";
import { buildGoogleMapsSearchUrl } from "@/lib/dispatch-route";
import { getServiceWindowLabel } from "@/lib/job-dispatch";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type FieldJob = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: string | null;
  start_date: string | null;
  service_window: string | null;
  assigned_technician: string | null;
  dispatch_sequence: number | null;
  dispatch_check_in_status: string | null;
  dispatch_eta_note: string | null;
  dispatch_last_known_location: string | null;
  dispatch_last_checked_in_at: string | null;
  dispatch_geo_latitude: number | null;
  dispatch_geo_longitude: number | null;
  dispatch_geo_accuracy_meters: number | null;
  dispatch_geo_captured_at: string | null;
  site_access_notes: string | null;
  clients: {
    name: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
  } | null;
};

interface FieldCheckInPageProps {
  params: Promise<{
    token: string;
  }>;
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function formatDateLabel(value?: string | null) {
  if (!value) {
    return "Not scheduled";
  }

  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleDateString("en-AU", {
        weekday: "short",
        day: "numeric",
        month: "short",
      });
}

export default async function FieldCheckInPage({ params }: FieldCheckInPageProps) {
  const { token } = await params;

  if (!uuidPattern.test(token)) {
    notFound();
  }

  const supabase = createAdminClient();
  const { data: job, error } = await supabase
    .from("jobs")
    .select(`
      id,
      user_id,
      title,
      description,
      status,
      start_date,
      service_window,
      assigned_technician,
      dispatch_sequence,
      dispatch_check_in_status,
      dispatch_eta_note,
      dispatch_last_known_location,
      dispatch_last_checked_in_at,
      dispatch_geo_latitude,
      dispatch_geo_longitude,
      dispatch_geo_accuracy_meters,
      dispatch_geo_captured_at,
      site_access_notes,
      clients:client_id (
        name,
        address,
        phone,
        email
      )
    `)
    .eq("dispatch_share_token", token)
    .eq("dispatch_share_enabled", true)
    .maybeSingle();

  if (error) {
    console.error("Field check-in job lookup failed", error);
    notFound();
  }

  if (!job) {
    notFound();
  }

  const fieldJob = job as unknown as FieldJob;
  const { data: businessProfile } = await supabase
    .from("business_profile")
    .select("business_name")
    .eq("user_id", fieldJob.user_id)
    .maybeSingle();
  const siteMapUrl = fieldJob.clients?.address
    ? buildGoogleMapsSearchUrl(fieldJob.clients.address)
    : null;
  const gpsMapUrl = buildDispatchGeoMapUrl(
    fieldJob.dispatch_geo_latitude,
    fieldJob.dispatch_geo_longitude,
  );
  const gpsPoint = formatDispatchGeoPoint(
    fieldJob.dispatch_geo_latitude,
    fieldJob.dispatch_geo_longitude,
  );
  const gpsAccuracy = formatDispatchGeoAccuracy(fieldJob.dispatch_geo_accuracy_meters);

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 rounded-3xl border border-border/70 bg-muted/30 p-5 shadow-sm sm:p-6">
          <p className="text-sm font-medium text-muted-foreground">
            {businessProfile?.business_name || "TradieFlow Dispatch"}
          </p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Field Check-In
              </h1>
              <p className="text-sm text-muted-foreground">
                Send a fast job-state update to dispatch. No dashboard login needed.
              </p>
            </div>
            <Badge variant={getDispatchCheckInVariant(fieldJob.dispatch_check_in_status)}>
              {getDispatchCheckInLabel(fieldJob.dispatch_check_in_status)}
            </Badge>
          </div>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>{fieldJob.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
                <div className="flex items-center gap-2">
                  <UserRound className="h-4 w-4" />
                  <span>{fieldJob.clients?.name || "Client not linked"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  <span>
                    {formatDateLabel(fieldJob.start_date)} |{" "}
                    {getServiceWindowLabel(fieldJob.service_window)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Wrench className="h-4 w-4" />
                  <span>{fieldJob.assigned_technician || "Crew not assigned"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPinned className="h-4 w-4" />
                  <span>
                    Run {fieldJob.dispatch_sequence ? `#${fieldJob.dispatch_sequence}` : "auto"}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-border/70 bg-muted/30 p-4 space-y-3">
                <div>
                  <p className="text-sm font-medium">Site</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {fieldJob.clients?.address || "No site address saved"}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {siteMapUrl ? (
                    <a
                      href={siteMapUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      Open Site Map
                    </a>
                  ) : null}
                  {fieldJob.clients?.phone ? (
                    <a
                      href={`tel:${fieldJob.clients.phone}`}
                      className={buttonVariants({ variant: "ghost", size: "sm" })}
                    >
                      <Phone className="mr-2 h-4 w-4" />
                      Call Client
                    </a>
                  ) : null}
                </div>
              </div>

              {fieldJob.description || fieldJob.site_access_notes ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-border/70 bg-muted/30 p-4">
                    <p className="text-sm font-medium">Job Notes</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                      {fieldJob.description || "No job notes recorded"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-muted/30 p-4">
                    <p className="text-sm font-medium">Site Access</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                      {fieldJob.site_access_notes || "No access notes recorded"}
                    </p>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Send Update</CardTitle>
            </CardHeader>
            <CardContent>
              <FieldCheckInForm
                token={token}
                initialStatus={fieldJob.dispatch_check_in_status}
                initialEtaNote={fieldJob.dispatch_eta_note}
                initialLastKnownLocation={fieldJob.dispatch_last_known_location}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Last Dispatch Signal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                Last check-in:{" "}
                {formatDispatchCheckInTimestamp(fieldJob.dispatch_last_checked_in_at)}
              </p>
              <p>Location note: {fieldJob.dispatch_last_known_location || "Not logged"}</p>
              <p>
                GPS:{" "}
                {gpsPoint
                  ? `${gpsPoint}${gpsAccuracy ? ` within about ${gpsAccuracy}` : ""}`
                  : "Not captured"}
              </p>
              <p>
                GPS captured: {formatDispatchGeoTimestamp(fieldJob.dispatch_geo_captured_at)}
              </p>
              {gpsMapUrl ? (
                <a
                  href={gpsMapUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  Open Last GPS Point
                </a>
              ) : null}
            </CardContent>
          </Card>

          <p className="pb-4 text-xs text-muted-foreground">
            This link updates only this job. Treat it like a dispatch handoff link and do not
            share it outside the crew working the callout.
          </p>

          <Link href="/" className="sr-only">
            TradieFlow
          </Link>
        </div>
      </div>
    </main>
  );
}
