import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeBookingUrlSlug } from "@/lib/booking";
import {
  LEAD_URGENCY_VALUES,
  buildLeadResponseDueAt,
  inferLeadUrgency,
} from "@/lib/lead-triage";

const leadSchema = z.object({
  booking_url_slug: z.string().trim().min(1),
  website: z.string().trim().optional().default(""),
  business_name: z.string().trim().max(120).optional().default(""),
  your_name: z.string().trim().min(2).max(120),
  mobile: z.string().trim().min(8).max(30),
  email: z.string().trim().email().max(255),
  service_area: z.string().trim().min(2).max(255),
  service_type: z.string().trim().min(2).max(80),
  lead_urgency: z.enum(LEAD_URGENCY_VALUES).optional(),
  triage_problem: z.string().trim().max(1000).optional().default(""),
  triage_site_risk: z.string().trim().max(1000).optional().default(""),
  triage_safety_risk: z.boolean().optional().default(false),
  team_size: z.string().trim().max(80).optional().default(""),
  after_hours_coverage: z.string().trim().max(80).optional().default(""),
  dispatch_radius: z.string().trim().max(80).optional().default(""),
  abn: z.string().trim().max(30).optional().default(""),
  notes: z.string().trim().max(2000).optional().default(""),
});

let ratelimit: Ratelimit | null = null;
let slugRatelimit: Ratelimit | null = null;

function getLeadRateLimit() {
  if (ratelimit) {
    return ratelimit;
  }

  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }

  ratelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(5, "10 s"),
    prefix: "rl:lead:ip",
  });

  return ratelimit;
}

function getSlugRateLimit() {
  if (slugRatelimit) {
    return slugRatelimit;
  }

  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }

  slugRatelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(30, "60 s"),
    prefix: "rl:lead:slug",
  });

  return slugRatelimit;
}

function getProfileSlaMinutes(profile: {
  emergency_response_sla_minutes?: number | null;
  same_day_response_sla_minutes?: number | null;
  scheduled_response_sla_minutes?: number | null;
  quote_response_sla_minutes?: number | null;
}) {
  return {
    emergency: profile.emergency_response_sla_minutes,
    same_day: profile.same_day_response_sla_minutes,
    scheduled: profile.scheduled_response_sla_minutes,
    quote: profile.quote_response_sla_minutes,
  };
}

function getClientIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const forwardedIp = forwardedFor?.split(",")[0]?.trim();
  const directIp = "ip" in request ? (request.ip as string | undefined) : undefined;

  return forwardedIp || directIp || "unknown";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = leadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
    }

    if (parsed.data.website) {
      return NextResponse.json({ success: true });
    }

    const limiter = getLeadRateLimit();
    if (!limiter) {
      console.error("Missing Upstash Redis configuration for lead rate limiting");
      return NextResponse.json({ error: "Lead capture unavailable" }, { status: 503 });
    }

    const ip = getClientIp(request);
    const { success: ipOk } = await limiter.limit(ip);

    if (!ipOk) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const bookingUrlSlug = normalizeBookingUrlSlug(parsed.data.booking_url_slug);
    if (!bookingUrlSlug) {
      return NextResponse.json({ error: "Missing booking_url_slug" }, { status: 400 });
    }

    // Secondary guard: cap submissions per booking slug across all IPs so that
    // a distributed botnet cannot flood a single tradie's form.
    const slugLimiter = getSlugRateLimit();
    if (slugLimiter) {
      const { success: slugOk } = await slugLimiter.limit(bookingUrlSlug);
      if (!slugOk) {
        return NextResponse.json({ error: "Too many requests" }, { status: 429 });
      }
    }

    const supabase = createAdminClient();

    const { data: businessProfile, error: businessError } = await supabase
      .from("business_profile")
      .select("id, emergency_response_sla_minutes, same_day_response_sla_minutes, scheduled_response_sla_minutes, quote_response_sla_minutes")
      .eq("booking_url_slug", bookingUrlSlug)
      .maybeSingle();

    if (businessError) {
      console.error("Business lookup error:", businessError);
      return NextResponse.json({ error: "Failed to resolve business" }, { status: 500 });
    }

    if (!businessProfile?.id) {
      return NextResponse.json({ error: "Unknown booking_url_slug" }, { status: 400 });
    }

    const combinedNotes =
      [
        parsed.data.business_name ? `Business: ${parsed.data.business_name}` : null,
        parsed.data.abn ? `ABN: ${parsed.data.abn}` : null,
        parsed.data.team_size ? `Team size: ${parsed.data.team_size}` : null,
        parsed.data.after_hours_coverage
          ? `After-hours coverage: ${parsed.data.after_hours_coverage}`
          : null,
        parsed.data.dispatch_radius
          ? `Dispatch radius: ${parsed.data.dispatch_radius}`
          : null,
        parsed.data.lead_urgency ? `Urgency: ${parsed.data.lead_urgency}` : null,
        parsed.data.triage_problem ? `Problem: ${parsed.data.triage_problem}` : null,
        parsed.data.triage_site_risk ? `Risk: ${parsed.data.triage_site_risk}` : null,
        parsed.data.triage_safety_risk ? "Safety-sensitive: yes" : null,
        parsed.data.notes || null,
      ]
        .filter(Boolean)
        .join(" | ")
        .trim() || null;
    const leadUrgency =
      parsed.data.lead_urgency ||
      inferLeadUrgency(
        parsed.data.service_type,
        parsed.data.triage_problem,
        parsed.data.triage_site_risk,
        parsed.data.notes,
      );
    const createdAt = new Date();
    const responseDueAt = buildLeadResponseDueAt(
      createdAt,
      leadUrgency,
      getProfileSlaMinutes(businessProfile),
    );

    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .insert({
        business_id: businessProfile.id,
        source: "book_page",
        status: "new",
        name: parsed.data.your_name,
        email: parsed.data.email,
        phone: parsed.data.mobile,
        suburb: parsed.data.service_area,
        postcode: null,
        job_type: parsed.data.service_type,
        preferred_date: null,
        preferred_time_window: null,
        notes: combinedNotes,
        lead_urgency: leadUrgency,
        response_due_at: responseDueAt,
        triage_problem: parsed.data.triage_problem || null,
        triage_site_risk: parsed.data.triage_site_risk || null,
        triage_safety_risk: parsed.data.triage_safety_risk,
        followup_step: 0,
        next_followup_at: createdAt.toISOString(),
        processing: false,
      })
      .select("id")
      .single();

    if (leadError || !lead?.id) {
      console.error("Lead creation error:", leadError);
      return NextResponse.json({ error: "Failed to create lead" }, { status: 500 });
    }

    await supabase.from("lead_events").insert({
      lead_id: lead.id,
      event_type: "created",
      meta: {
        source: "book_page",
        booking_url_slug: bookingUrlSlug,
        ip,
        business_name: parsed.data.business_name || null,
        abn: parsed.data.abn || null,
        service_area: parsed.data.service_area || null,
        service_type: parsed.data.service_type || null,
        lead_urgency: leadUrgency,
        response_due_at: responseDueAt,
        triage_problem: parsed.data.triage_problem || null,
        triage_site_risk: parsed.data.triage_site_risk || null,
        triage_safety_risk: parsed.data.triage_safety_risk,
        team_size: parsed.data.team_size || null,
        after_hours_coverage: parsed.data.after_hours_coverage || null,
        dispatch_radius: parsed.data.dispatch_radius || null,
      },
    });

    return NextResponse.json({ success: true, lead_id: lead.id });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
