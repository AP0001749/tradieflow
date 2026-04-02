import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { getResend, getResendSenderEmail } from "@/lib/resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROUTE_VERSION = "compat-v5";

type ClaimedLead = {
  id: string;
  business_id: string;
  name: string;
  email: string;
  phone: string | null;
  suburb: string | null;
  job_type: string | null;
  preferred_date: string | null;
  preferred_time_window: string | null;
  notes: string | null;
  followup_step: number;
  status: string;
  business_name: string | null;
  reply_to_email: string | null;
};

type LeadResults = {
  processed: number;
  sent: number;
  errors: number;
  stale: number;
};

function getCronSecrets() {
  const configuredSecrets = [
    process.env.LEAD_FOLLOWUP_SECRET,
    process.env.CRON_SECRET,
  ]
    .flatMap((value) => (value || "").split(","))
    .map((value) => value.trim().replace(/^(['"])(.*)\1$/, "$2").trim())
    .filter(Boolean);

  return Array.from(new Set(configuredSecrets));
}

function getCronSecretSources() {
  const sources: string[] = [];

  if (process.env.LEAD_FOLLOWUP_SECRET?.trim()) {
    sources.push("LEAD_FOLLOWUP_SECRET");
  }

  if (process.env.CRON_SECRET?.trim()) {
    sources.push("CRON_SECRET");
  }

  return sources;
}

function normalizeIncomingSecret(value: string | null) {
  return value?.trim().replace(/^(['"])(.*)\1$/, "$2").trim() || null;
}

function secretsMatch(candidate: string | null, configuredSecrets: string[]) {
  if (!candidate) {
    return false;
  }

  const candidateBuffer = Buffer.from(candidate);

  return configuredSecrets.some((secret) => {
    const secretBuffer = Buffer.from(secret);

    return (
      candidateBuffer.length === secretBuffer.length &&
      timingSafeEqual(candidateBuffer, secretBuffer)
    );
  });
}

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
  extraHeaders?: HeadersInit,
) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      Allow: "GET, POST",
      "X-TradieFlow-Followup-Auth": "bearer-or-x-cron-secret",
      "X-TradieFlow-Followup-Route": ROUTE_VERSION,
      ...extraHeaders,
    },
  });
}

function immediateFollowupHtml(lead: ClaimedLead, businessName: string) {
  const jobType = lead.job_type?.replaceAll("_", " ") || "your trade business";
  const suburb = lead.suburb || "your service area";

  return `
    <html>
      <body style="background:#f6f9fc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;padding:24px;">
        <div style="background:#ffffff;max-width:640px;margin:0 auto;padding:32px 40px;">
          <h1 style="color:#333333;">Thanks for requesting TradieFlow</h1>
          <p>Hi ${lead.name},</p>
          <p>We received your setup request for ${jobType} in ${suburb}.</p>
          <p><strong>To set up your workspace, please reply with:</strong></p>
          <ul>
            <li>Team size (solo, 2-5, or 6+ techs)</li>
            <li>Main services or callouts you want to prioritize</li>
            <li>Best contact number for onboarding</li>
            <li>Preferred time for a quick setup call</li>
          </ul>
          <p>We'll configure your TradieFlow workspace around lead recovery, quote follow-up, and invoicing, then send your next steps within one business day.</p>
          <hr style="border:none;border-top:1px solid #e6ebf1;margin:24px 0;" />
          <p style="color:#8898aa;font-size:12px;line-height:16px;">${businessName}<br />Reply to this email to continue onboarding</p>
        </div>
      </body>
    </html>
  `;
}

function twentyFourHourFollowupHtml(lead: ClaimedLead, businessName: string) {
  const jobType = lead.job_type?.replaceAll("_", " ") || "your trade business";

  return `
    <html>
      <body style="background:#f6f9fc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;padding:24px;">
        <div style="background:#ffffff;max-width:640px;margin:0 auto;padding:32px 40px;">
          <h1 style="color:#333333;">Quick follow-up</h1>
          <p>Hi ${lead.name},</p>
          <p>Just checking in on your TradieFlow setup request for ${jobType}.</p>
          <p><strong>Ready to get started?</strong> Reply "YES" and share the best time to map your missed-call and follow-up workflow.</p>
          <p>If timing changed or you no longer need help, just reply and I'll close the request.</p>
          <hr style="border:none;border-top:1px solid #e6ebf1;margin:24px 0;" />
          <p style="color:#8898aa;font-size:12px;line-height:16px;">${businessName}<br />Reply to this email to continue setup</p>
        </div>
      </body>
    </html>
  `;
}

function fortyEightHourFollowupHtml(lead: ClaimedLead, businessName: string) {
  return `
    <html>
      <body style="background:#f6f9fc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;padding:24px;">
        <div style="background:#ffffff;max-width:640px;margin:0 auto;padding:32px 40px;">
          <h1 style="color:#333333;">Last check-in</h1>
          <p>Hi ${lead.name},</p>
          <p>I haven't heard back about your TradieFlow setup request.</p>
          <p><strong>Reply "YES" if you still want to plug missed-call leaks and get set up</strong> - otherwise I'll close this request.</p>
          <p>No pressure either way. If you want to start later, just reply and we can reopen it anytime.</p>
          <hr style="border:none;border-top:1px solid #e6ebf1;margin:24px 0;" />
          <p style="color:#8898aa;font-size:12px;line-height:16px;">${businessName}<br />Reply to this email if you still want setup</p>
        </div>
      </body>
    </html>
  `;
}

function buildEmailPayload(lead: ClaimedLead, results: LeadResults) {
  const businessName = lead.business_name || "TradieFlow";
  let subject = "";
  let html = "";
  let nextStep = lead.followup_step + 1;
  let nextFollowupAt: string | null = null;
  let newStatus = lead.status;

  switch (lead.followup_step) {
    case 0:
      subject = "TradieFlow setup request received";
      html = immediateFollowupHtml(lead, businessName);
      nextFollowupAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      newStatus = "contacted";
      break;
    case 1:
      subject = "Quick follow-up - ready to set up TradieFlow?";
      html = twentyFourHourFollowupHtml(lead, businessName);
      nextFollowupAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
      break;
    case 2:
      subject = "Last check-in - should I close your setup request?";
      html = fortyEightHourFollowupHtml(lead, businessName);
      nextStep = 3;
      newStatus = "stale";
      results.stale += 1;
      break;
    default:
      return null;
  }

  return {
    subject,
    html,
    nextStep,
    nextFollowupAt,
    newStatus,
  };
}

async function handleFollowupRequest(request: Request) {
  const cronSecrets = getCronSecrets();
  const cronSecretSources = getCronSecretSources();
  const authHeader = request.headers.get("authorization");
  const bearerSecret = normalizeIncomingSecret(
    authHeader?.replace(/^Bearer\s+/i, "") || null,
  );
  const headerSecret = normalizeIncomingSecret(
    request.headers.get("x-cron-secret"),
  );

  if (cronSecrets.length === 0) {
    return jsonResponse(
      { error: "Cron route not configured" },
      500,
      {
        "X-TradieFlow-Followup-Secret-Count": "0",
        "X-TradieFlow-Followup-Secret-Sources": "none",
      },
    );
  }

  const isAuthorized = [bearerSecret, headerSecret]
    .filter((value): value is string => Boolean(value))
    .some((value) => secretsMatch(value, cronSecrets));

  if (!isAuthorized) {
    return jsonResponse(
      { error: "Unauthorized" },
      401,
      {
        "X-TradieFlow-Followup-Secret-Count": String(cronSecrets.length),
        "X-TradieFlow-Followup-Secret-Sources":
          cronSecretSources.join(",") || "none",
      },
    );
  }

  try {
    const supabase = createAdminClient();
    const resend = getResend();
    const senderEmail = getResendSenderEmail();
    const fallbackReplyTo = process.env.RESEND_REPLY_TO_EMAIL || undefined;

    const { data: leads, error: claimError } = await supabase.rpc("claim_due_leads", {
      limit_count: 50,
    });

    if (claimError) {
      console.error("Claim error:", claimError);
      return jsonResponse(
        { error: "Failed to claim leads" },
        500,
        {
          "X-TradieFlow-Followup-Secret-Count": String(cronSecrets.length),
          "X-TradieFlow-Followup-Secret-Sources":
            cronSecretSources.join(",") || "none",
        },
      );
    }

    const results: LeadResults = {
      processed: 0,
      sent: 0,
      errors: 0,
      stale: 0,
    };

    for (const lead of (leads || []) as ClaimedLead[]) {
      results.processed += 1;

      try {
        const payload = buildEmailPayload(lead, results);

        if (!payload) {
          await supabase
            .from("leads")
            .update({
              processing: false,
              processing_started_at: null,
            })
            .eq("id", lead.id);
          continue;
        }

        const replyToEmail = lead.reply_to_email || fallbackReplyTo;
        const { error: emailError } = await resend.emails.send({
          from: senderEmail,
          ...(replyToEmail ? { replyTo: replyToEmail } : {}),
          to: [lead.email],
          subject: payload.subject,
          html: payload.html,
        });

        if (emailError) {
          throw new Error(emailError.message || "Failed to send email");
        }

        results.sent += 1;

        await supabase
          .from("leads")
          .update({
            followup_step: payload.nextStep,
            last_contacted_at: new Date().toISOString(),
            next_followup_at: payload.nextFollowupAt,
            status: payload.newStatus,
            processing: false,
            processing_started_at: null,
          })
          .eq("id", lead.id);

        await supabase.from("lead_events").insert({
          lead_id: lead.id,
          event_type: "email_sent",
          meta: {
            step: lead.followup_step,
            subject: payload.subject,
            next_step: payload.nextStep,
            source: "next-cron-route",
          },
        });
      } catch (error) {
        results.errors += 1;
        console.error(`Error processing lead ${lead.id}:`, error);

        await supabase
          .from("leads")
          .update({
            processing: false,
            processing_started_at: null,
          })
          .eq("id", lead.id);

        await supabase.from("lead_events").insert({
          lead_id: lead.id,
          event_type: "error",
          meta: {
            error: error instanceof Error ? error.message : "Unknown error",
            step: lead.followup_step,
            source: "next-cron-route",
          },
        });
      }
    }

    return jsonResponse({
      success: true,
      results,
      timestamp: new Date().toISOString(),
      source: "next-cron-route",
      method: request.method,
    }, 200, {
      "X-TradieFlow-Followup-Secret-Count": String(cronSecrets.length),
      "X-TradieFlow-Followup-Secret-Sources":
        cronSecretSources.join(",") || "none",
    });
  } catch (error) {
    console.error("Lead follow-up route error:", error);
    return jsonResponse(
      {
        error: "Lead follow-up failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500,
      {
        "X-TradieFlow-Followup-Secret-Count": String(cronSecrets.length),
        "X-TradieFlow-Followup-Secret-Sources":
          cronSecretSources.join(",") || "none",
      },
    );
  }
}

export async function GET(request: Request) {
  return handleFollowupRequest(request);
}

export async function POST(request: Request) {
  return handleFollowupRequest(request);
}
