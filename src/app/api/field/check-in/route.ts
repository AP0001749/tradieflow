import { NextResponse } from "next/server";
import { z } from "zod";

import { DISPATCH_CHECK_IN_VALUES } from "@/lib/dispatch-check-in";
import { formatDispatchGeoPoint } from "@/lib/dispatch-geo";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function nullableTrimmedString(maxLength: number) {
  return z
    .string()
    .trim()
    .max(maxLength)
    .optional()
    .nullable()
    .transform((value) => value || null);
}

const fieldCheckInSchema = z.object({
  token: z.string().trim().regex(uuidPattern),
  dispatch_check_in_status: z.enum(DISPATCH_CHECK_IN_VALUES),
  dispatch_eta_note: nullableTrimmedString(160),
  dispatch_last_known_location: nullableTrimmedString(220),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  accuracy: z.number().min(0).max(100000).optional().nullable(),
});

export async function POST(request: Request) {
  try {
    const parsed = fieldCheckInSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid check-in payload" }, { status: 400 });
    }

    const hasLatitude = typeof parsed.data.latitude === "number";
    const hasLongitude = typeof parsed.data.longitude === "number";

    if (hasLatitude !== hasLongitude) {
      return NextResponse.json(
        { error: "Latitude and longitude must be submitted together" },
        { status: 400 },
      );
    }

    const hasGeoPoint = hasLatitude && hasLongitude;
    const capturedAt = new Date().toISOString();
    const geoPoint = hasGeoPoint
      ? formatDispatchGeoPoint(parsed.data.latitude, parsed.data.longitude)
      : null;
    const lastKnownLocation =
      parsed.data.dispatch_last_known_location || geoPoint || null;

    const supabase = createAdminClient();
    const updatePayload = {
      dispatch_check_in_status: parsed.data.dispatch_check_in_status,
      dispatch_eta_note: parsed.data.dispatch_eta_note,
      dispatch_last_known_location: lastKnownLocation,
      dispatch_last_checked_in_at: capturedAt,
      ...(hasGeoPoint
        ? {
            dispatch_geo_latitude: parsed.data.latitude,
            dispatch_geo_longitude: parsed.data.longitude,
            dispatch_geo_accuracy_meters: parsed.data.accuracy ?? null,
            dispatch_geo_captured_at: capturedAt,
          }
        : {}),
    };

    const { data, error } = await supabase
      .from("jobs")
      .update(updatePayload)
      .eq("dispatch_share_token", parsed.data.token)
      .eq("dispatch_share_enabled", true)
      .select("id, user_id")
      .maybeSingle();

    if (error) {
      console.error("Field check-in update failed", error);
      return NextResponse.json({ error: "Unable to save check-in" }, { status: 500 });
    }

    if (!data?.id) {
      return NextResponse.json({ error: "Check-in link not found" }, { status: 404 });
    }

    const { error: eventError } = await supabase.from("job_dispatch_events").insert({
      job_id: data.id,
      user_id: data.user_id,
      event_source: "field_link",
      event_type: "check_in",
      dispatch_check_in_status: parsed.data.dispatch_check_in_status,
      dispatch_eta_note: parsed.data.dispatch_eta_note,
      dispatch_last_known_location: lastKnownLocation,
      dispatch_geo_latitude: hasGeoPoint ? parsed.data.latitude : null,
      dispatch_geo_longitude: hasGeoPoint ? parsed.data.longitude : null,
      dispatch_geo_accuracy_meters: hasGeoPoint ? parsed.data.accuracy ?? null : null,
      dispatch_geo_captured_at: hasGeoPoint ? capturedAt : null,
      metadata: {
        has_geo_point: hasGeoPoint,
        user_agent: request.headers.get("user-agent")?.slice(0, 240) || null,
      },
    });

    if (eventError) {
      console.warn("Unable to write field check-in audit event:", eventError);
    }

    return NextResponse.json({
      success: true,
      checked_in_at: capturedAt,
      has_geo_point: hasGeoPoint,
    });
  } catch (error) {
    console.error("Field check-in endpoint failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
