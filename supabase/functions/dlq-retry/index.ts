import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import twilio from "npm:twilio";
import { Resend } from "npm:resend@6.7.0";

const createAdminClient = () => {
  const supabaseUrl = Deno.env.get("NEXT_PUBLIC_SUPABASE_URL") || Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) throw new Error("Missing Supabase Env");
  return createClient(supabaseUrl, serviceRoleKey);
};

type WebhookFailure = {
  id: string;
  provider: "twilio" | "resend" | string;
  payload: Record<string, unknown>;
  retry_count: number;
  claim_token: string | null;
};

function requireCronSecret(request: Request) {
  const expected = Deno.env.get("LEAD_FOLLOWUP_SECRET") || Deno.env.get("CRON_SECRET");
  if (!expected) {
    throw new Error("Missing LEAD_FOLLOWUP_SECRET");
  }

  const headerSecret = request.headers.get("x-cron-secret");
  const authHeader = request.headers.get("authorization");
  const bearer = authHeader?.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : null;

  if (headerSecret !== expected && bearer !== expected) {
    return false;
  }

  return true;
}

serve(async (request) => {
  try {
    if (!requireCronSecret(request)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = createAdminClient();
    const { data: failures, error: claimError } = await supabase.rpc(
      "claim_webhook_failures",
      { limit_count: 50 },
    );

    if (claimError) throw claimError;

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const resend = resendApiKey ? new Resend(resendApiKey) : null;
    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioClient = accountSid && authToken ? twilio(accountSid, authToken) : null;

    let processed = 0;

    for (const item of ((failures || []) as WebhookFailure[])) {
      processed += 1;
      try {
        if (item.provider === "twilio") {
          if (!twilioClient) throw new Error("Twilio not configured");
          const payload = item.payload as Parameters<
            NonNullable<typeof twilioClient>["messages"]["create"]
          >[0];
          await twilioClient.messages.create(payload);
        } else if (item.provider === "resend") {
          if (!resend) throw new Error("Resend not configured");
          const payload = item.payload as Parameters<typeof resend.emails.send>[0];
          const { error: emailError } = await resend.emails.send(payload);
          if (emailError) {
            throw new Error(emailError.message || "Resend send failed");
          }
        } else {
          throw new Error(`Unsupported provider: ${item.provider}`);
        }

        await supabase
          .from("webhook_failures")
          .update({
            status: "success",
            claimed_at: null,
            claim_token: null,
            error_message: null,
          })
          .eq("id", item.id)
          .eq("claim_token", item.claim_token);
      } catch (err) {
        const newRetryCount = (item.retry_count || 0) + 1;
        const status = newRetryCount > 5 ? "failed" : "pending";
        const nextRetryAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
        const errorMessage = String(err).slice(0, 500);

        await supabase
          .from("webhook_failures")
          .update({
            retry_count: newRetryCount,
            status,
            next_retry_at: nextRetryAt,
            error_message: errorMessage,
            claimed_at: null,
            claim_token: null,
          })
          .eq("id", item.id)
          .eq("claim_token", item.claim_token);
      }
    }

    return new Response(JSON.stringify({ success: true, processed }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(String(err), { status: 500 });
  }
});
