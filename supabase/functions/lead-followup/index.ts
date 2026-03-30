import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { Resend } from "npm:resend@6.7.0";

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

function requireEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

function requireSenderEmail() {
  return (
    Deno.env.get("RESEND_SENDER_EMAIL") ||
    Deno.env.get("RESEND_FROM_EMAIL") ||
    (() => {
      throw new Error(
        "Missing environment variable: RESEND_SENDER_EMAIL or RESEND_FROM_EMAIL",
      );
    })()
  );
}

function immediateFollowupHtml(lead: ClaimedLead, businessName: string) {
  const jobType = lead.job_type?.replaceAll("_", " ") || "cleaning services";
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
            <li>Team size (solo, 2-5, or 6+ cleaners)</li>
            <li>Main services you want to prioritize</li>
            <li>Best contact number for onboarding</li>
            <li>Preferred time for a quick setup call</li>
          </ul>
          <p>We&apos;ll configure your TradieFlow workspace and send your next steps within one business day.</p>
          <hr style="border:none;border-top:1px solid #e6ebf1;margin:24px 0;" />
          <p style="color:#8898aa;font-size:12px;line-height:16px;">${businessName}<br />Reply to this email to continue onboarding</p>
        </div>
      </body>
    </html>
  `;
}

function twentyFourHourFollowupHtml(lead: ClaimedLead, businessName: string) {
  const jobType = lead.job_type?.replaceAll("_", " ") || "your cleaning business";

  return `
    <html>
      <body style="background:#f6f9fc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;padding:24px;">
        <div style="background:#ffffff;max-width:640px;margin:0 auto;padding:32px 40px;">
          <h1 style="color:#333333;">Quick follow-up</h1>
          <p>Hi ${lead.name},</p>
          <p>Just checking in on your TradieFlow setup request for ${jobType}.</p>
          <p><strong>Ready to get started?</strong> Reply "YES" and share the best time for onboarding.</p>
          <p>If timing changed or you no longer need help, just reply and I&apos;ll close the request.</p>
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
          <p>I haven&apos;t heard back about your TradieFlow setup request.</p>
          <p><strong>Reply "YES" if you still want to get set up</strong> - otherwise I&apos;ll close this request.</p>
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
    businessName,
    subject,
    html,
    nextStep,
    nextFollowupAt,
    newStatus,
  };
}

serve(async (request) => {
  try {
    const functionSecret = requireEnv("LEAD_FOLLOWUP_SECRET");
    const headerSecret = request.headers.get("x-cron-secret");

    if (headerSecret !== functionSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }

    const supabaseUrl = requireEnv("SUPABASE_URL");
    const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
    const resendApiKey = requireEnv("RESEND_API_KEY");
    const senderEmail = requireSenderEmail();
    const fallbackReplyTo = Deno.env.get("RESEND_REPLY_TO_EMAIL") || undefined;

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const resend = new Resend(resendApiKey);

    const { data: leads, error: claimError } = await supabase.rpc("claim_due_leads", {
      limit_count: 50,
    });

    if (claimError) {
      console.error("Claim error:", claimError);
      return new Response(JSON.stringify({ error: "Failed to claim leads" }), {
        status: 500,
        headers: { "content-type": "application/json" },
      });
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
          to: lead.email,
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
            source: "supabase-edge-function",
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
            source: "supabase-edge-function",
          },
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        results,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { "content-type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({
        error: "Lead follow-up failed",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "content-type": "application/json" },
      },
    );
  }
});
