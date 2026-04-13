"use client";

import { FormEvent, useState, useTransition } from "react";
import { MapPinned, Navigation } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectItem } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DISPATCH_CHECK_IN_OPTIONS } from "@/lib/dispatch-check-in";
import {
  formatDispatchGeoAccuracy,
  formatDispatchGeoPoint,
} from "@/lib/dispatch-geo";

type GeoPoint = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
};

type FieldCheckInFormProps = {
  token: string;
  initialStatus?: string | null;
  initialEtaNote?: string | null;
  initialLastKnownLocation?: string | null;
};

async function readJsonError(response: Response) {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error || "Unable to save check-in";
  } catch {
    return "Unable to save check-in";
  }
}

export function FieldCheckInForm({
  token,
  initialStatus,
  initialEtaNote,
  initialLastKnownLocation,
}: FieldCheckInFormProps) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState(initialStatus || "en_route");
  const [etaNote, setEtaNote] = useState(initialEtaNote || "");
  const [lastKnownLocation, setLastKnownLocation] = useState(
    initialLastKnownLocation || "",
  );
  const [geoPoint, setGeoPoint] = useState<GeoPoint | null>(null);
  const [geoMessage, setGeoMessage] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  function useBrowserLocation() {
    setGeoMessage(null);
    setMessage(null);

    if (!navigator.geolocation) {
      setGeoMessage("This browser does not support location sharing.");
      return;
    }

    setGeoMessage("Requesting location permission...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextPoint = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy:
            typeof position.coords.accuracy === "number"
              ? position.coords.accuracy
              : null,
        };

        setGeoPoint(nextPoint);
        setGeoMessage("GPS point captured. Submit the check-in to send it.");

        if (!lastKnownLocation.trim()) {
          setLastKnownLocation(
            formatDispatchGeoPoint(nextPoint.latitude, nextPoint.longitude) || "",
          );
        }
      },
      (error) => {
        setGeoMessage(error.message || "Location permission was not granted.");
      },
      {
        enableHighAccuracy: true,
        maximumAge: 30000,
        timeout: 10000,
      },
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    startTransition(async () => {
      const response = await fetch("/api/field/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          dispatch_check_in_status: status,
          dispatch_eta_note: etaNote,
          dispatch_last_known_location: lastKnownLocation,
          latitude: geoPoint?.latitude ?? null,
          longitude: geoPoint?.longitude ?? null,
          accuracy: geoPoint?.accuracy ?? null,
        }),
      });

      if (!response.ok) {
        setMessage({ type: "error", text: await readJsonError(response) });
        return;
      }

      const body = (await response.json()) as { checked_in_at?: string };
      const checkedInAt = body.checked_in_at
        ? new Date(body.checked_in_at).toLocaleString("en-AU", {
            day: "numeric",
            month: "short",
            hour: "numeric",
            minute: "2-digit",
          })
        : "just now";

      setMessage({
        type: "success",
        text: `Check-in sent ${checkedInAt}. Dispatch can see this update now.`,
      });
    });
  }

  const formattedGeoPoint = formatDispatchGeoPoint(
    geoPoint?.latitude,
    geoPoint?.longitude,
  );
  const formattedAccuracy = formatDispatchGeoAccuracy(geoPoint?.accuracy);

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="dispatch_check_in_status">Crew Status</Label>
          <Select
            id="dispatch_check_in_status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
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
          <Label htmlFor="dispatch_eta_note">ETA / Arrival Note</Label>
          <Input
            id="dispatch_eta_note"
            value={etaNote}
            onChange={(event) => setEtaNote(event.target.value)}
            placeholder="e.g. 15 mins out, parking now, parts run"
            maxLength={160}
            disabled={isPending}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="dispatch_last_known_location">Location Note</Label>
        <Textarea
          id="dispatch_last_known_location"
          value={lastKnownLocation}
          onChange={(event) => setLastKnownLocation(event.target.value)}
          placeholder="e.g. outside site, on Princes Hwy, roof cavity, parts supplier"
          maxLength={220}
          disabled={isPending}
        />
      </div>

      <div className="rounded-xl border border-border/70 bg-muted/30 p-4 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="flex items-center gap-2 text-sm font-medium">
              <MapPinned className="h-4 w-4" />
              Optional GPS Point
            </p>
            <p className="text-sm text-muted-foreground">
              Use this only when the customer/site context makes location useful for dispatch.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={useBrowserLocation}
            disabled={isPending}
          >
            <Navigation className="mr-2 h-4 w-4" />
            Use My Location
          </Button>
        </div>

        {formattedGeoPoint ? (
          <p className="text-sm text-muted-foreground">
            Captured: {formattedGeoPoint}
            {formattedAccuracy ? ` within about ${formattedAccuracy}` : ""}
          </p>
        ) : null}
        {geoMessage ? <p className="text-sm text-muted-foreground">{geoMessage}</p> : null}
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

      <Button type="submit" className="w-full sm:w-auto" disabled={isPending}>
        {isPending ? "Sending Check-In..." : "Send Check-In"}
      </Button>
    </form>
  );
}
