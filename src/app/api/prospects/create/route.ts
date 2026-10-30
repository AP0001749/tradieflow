import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

import { getResend, getResendSenderEmail } from "@/lib/resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const prospectSchema = z.object({
  business_name: z.string().trim().min(2).max(120),
  contact_name: z.string().trim().min(2).max(120),
  mobile: z.string().trim().min(8).max(32),
  email: z.string().trim().email().max(200),
  service_area: z.string().trim().min(2).max(120),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  website: z.string().max(0).optional().or(z.literal("")),
});

let prospectRatelimit: Ratelimit | null = null;

function getProspectRateLimit() {
  if (prospectRatelimit) {
    return prospectRatelimit;
  }

  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }

  prospectRatelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(3, "60 s"),
    prefix: "rl:prospect:ip",
  });

  return prospectRatelimit;
}

function getClientIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const forwardedIp = forwardedFor?.split(",")[0]?.trim();
  const directIp = "ip" in request ? (request.ip as string | undefined) : undefined;
  return forwardedIp || directIp || "unknown";
}

export async function POST(request: NextRequest) {
  try {
    const limiter = getProspectRateLimit();
    if (!limiter) {
      return NextResponse.json(
        { error: "Prospect intake is temporarily unavailable" },
        { status: 503 }
      );
    }

    const { success } = await limiter.limit(getClientIp(request));
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await request.json().catch(() => null);
    const parsed = prospectSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid prospect details" }, { status: 400 });
    }

    if (parsed.data.website) {
      return NextResponse.json({ success: true });
    }

    const sender = getResendSenderEmail();
    const resend = getResend();
    const destination =
      process.env.RESEND_REPLY_TO_EMAIL?.trim() ||
      process.env.RESEND_SENDER_EMAIL?.trim() ||
      sender;

    const { error } = await resend.emails.send({
      from: sender,
      to: [destination],
      replyTo: parsed.data.email,
      subject: `Dispatch audit request from ${parsed.data.business_name}`,
      html: `
        <p><strong>Business:</strong> ${escapeHtml(parsed.data.business_name)}</p>
        <p><strong>Contact:</strong> ${escapeHtml(parsed.data.contact_name)}</p>
        <p><strong>Mobile:</strong> ${escapeHtml(parsed.data.mobile)}</p>
        <p><strong>Email:</strong> ${escapeHtml(parsed.data.email)}</p>
        <p><strong>Service area:</strong> ${escapeHtml(parsed.data.service_area)}</p>
        <p><strong>Notes:</strong> ${escapeHtml(parsed.data.notes || "None")}</p>
      `,
    });

    if (error) {
      console.error("Prospect enquiry email failed", error);
      return NextResponse.json({ error: "Failed to submit request" }, { status: 502 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Prospect enquiry failed", error);
    return NextResponse.json({ error: "Failed to submit request" }, { status: 500 });
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
