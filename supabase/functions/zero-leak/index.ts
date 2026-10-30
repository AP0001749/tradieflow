import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { Resend } from "npm:resend@6.7.0";
import twilio from "npm:twilio";

// --- Inlined from src/lib/zero-leak.ts ---
const DEFAULT_QUOTE_FOLLOWUP_TEMPLATE =
  "Hey {{contact_name}}, just checking if you had any questions about the install or repair quote for {{job_title}}. Reply here and {{business_name}} will help you lock in the next step. Reply STOP to opt out.";

const DEFAULT_REVIEW_REQUEST_TEMPLATE =
  "Hi {{contact_name}}, thanks again for choosing {{business_name}}. If the job went well, could you leave us a quick 5-star Google review? It really helps local customers trust us in an emergency. {{google_review_url}} Reply STOP to opt out.";

function coerceAutomationTemplate(value: string | null | undefined, fallback: string) {
  const normalizedValue = value?.trim();
  return normalizedValue ? normalizedValue : fallback;
}

function renderAutomationTemplate(
  template: string,
  values: Record<string, string | number | null | undefined>
) {
  return template.replace(/{{\s*([\w_]+)\s*}}/g, (_match, key: string) => {
    const value = values[key];
    return value === null || value === undefined ? "" : String(value);
  });
}

// --- Inlined from src/lib/pricing.ts ---
type SubscriptionPlanKey = "free" | "baseline" | "apex";

const ACTIVE_PAID_SUBSCRIPTION_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
]);

function parsePlanKey(value: unknown): "baseline" | "apex" | null {
  if (value === "baseline" || value === "apex") return value;
  return null;
}

function hasApexAutomationAccess(planKey: SubscriptionPlanKey) {
  return planKey === "apex";
}

function getEffectiveSubscriptionPlanKey({
  subscriptionPlanKey,
  subscriptionTier,
  subscriptionStatus,
}: {
  subscriptionPlanKey?: unknown;
  subscriptionTier?: unknown;
  subscriptionStatus?: unknown;
}): SubscriptionPlanKey {
  const normalizedPlanKey = parsePlanKey(subscriptionPlanKey);
  const normalizedTier =
    typeof subscriptionTier === "string" ? subscriptionTier.trim().toLowerCase() : "";
  const normalizedStatus =
    typeof subscriptionStatus === "string"
      ? subscriptionStatus.trim().toLowerCase() || "active"
      : "active";
  const hasPaidMarker = Boolean(normalizedPlanKey) || normalizedTier === "pro";
  if (!hasPaidMarker || !ACTIVE_PAID_SUBSCRIPTION_STATUSES.has(normalizedStatus)) {
    return "free";
  }
  return normalizedPlanKey ?? "baseline";
}
// --- End inlined ---

const createAdminClient = () => {
  const supabaseUrl = Deno.env.get("NEXT_PUBLIC_SUPABASE_URL") || Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) throw new Error("Missing Supabase Env");
  return createClient(supabaseUrl, serviceRoleKey);
};

const getResendSenderEmail = () =>
  Deno.env.get("RESEND_SENDER_EMAIL") || Deno.env.get("RESEND_FROM_EMAIL") || "dummy@example.com";
const getResend = () => new Resend(Deno.env.get("RESEND_API_KEY"));

const ROUTE_VERSION = "zero-leak-v1";

type DispatchResults = {
  processed: number;
  sent: number;
  errors: number;
};

type ClaimedQuoteFollowup = {
  job_id: string;
  user_id: string;
  job_title: string;
  job_price: number | string | null;
  quote_sent_at: string;
  business_name: string | null;
  reply_to_email: string | null;
  quote_followup_template: string | null;
  twilio_phone_number: string | null;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
};

type ClaimedReviewRequest = {
  invoice_id: string;
  user_id: string;
  job_title: string;
  invoice_amount: number | string;
  paid_at: string;
  business_name: string | null;
  reply_to_email: string | null;
  review_request_template: string | null;
  google_review_url: string;
  twilio_phone_number: string | null;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
};

type SubscriptionProfile = {
  subscription_plan_key: string | null;
  subscription_status: string | null;
  subscription_tier: string | null;
};

type SmsSuppressionState = {
  reason: string | null;
  suppressed: boolean;
};

function getCronSecrets() {
  const configuredSecrets = [
    Deno.env.get("LEAD_FOLLOWUP_SECRET"),
    Deno.env.get("CRON_SECRET"),
  ]
    .flatMap((value) => (value || "").split(","))
    .map((value) => value.trim().replace(/^(['"])(.*)\1$/, "$2").trim())
    .filter(Boolean);

  return Array.from(new Set(configuredSecrets));
}

function getCronSecretSources() {
  const sources: string[] = [];
  if (Deno.env.get("LEAD_FOLLOWUP_SECRET")?.trim()) sources.push("LEAD_FOLLOWUP_SECRET");
  if (Deno.env.get("CRON_SECRET")?.trim()) sources.push("CRON_SECRET");
  return sources;
}

function normalizeIncomingSecret(value: string | null) {
  return value?.trim().replace(/^(['"])(.*)\1$/, "$2").trim() || null;
}

function secretsMatch(candidate: string | null, configuredSecrets: string[]) {
  if (!candidate) return false;
  const candidateBuffer = Buffer.from(candidate);
  return configuredSecrets.some((secret) => {
    const secretBuffer = Buffer.from(secret);
    return candidateBuffer.length === secretBuffer.length && candidate === secret;
  });
}

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
  extraHeaders?: HeadersInit
) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      Allow: "GET, POST",
      "X-TradieFlow-Zero-Leak-Auth": "bearer-or-x-cron-secret",
      "X-TradieFlow-Zero-Leak-Route": ROUTE_VERSION,
      ...extraHeaders,
    },
  });
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function textToHtml(value: string) {
  return escapeHtml(value).replace(/\r?\n/g, "<br />");
}

function buildHtmlEmail(message: string, businessName: string) {
  return `
    <html>
      <body style="background:#f6f9fc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;padding:24px;">
        <div style="background:#ffffff;max-width:640px;margin:0 auto;padding:32px 40px;border-radius:16px;">
          <div style="font-size:16px;line-height:1.65;color:#172033;">${textToHtml(message)}</div>
          <hr style="border:none;border-top:1px solid #e6ebf1;margin:24px 0;" />
          <p style="color:#8898aa;font-size:12px;line-height:16px;">${escapeHtml(businessName)}<br />Sent by TradieFlow Zero-Leak automation</p>
        </div>
      </body>
    </html>
  `;
}

function formatMoney(amount: number | string | null | undefined) {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount)) return "";
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 2,
  }).format(numericAmount);
}

function getPhoneDigits(value: string | null | undefined) {
  return (value || "").replace(/\D+/g, "");
}

function normalizeAustralianPhone(value: string | null | undefined) {
  const digits = getPhoneDigits(value);
  if (!digits) return null;
  if (digits.startsWith("61") && digits.length >= 11) return `+${digits}`;
  if (digits.startsWith("0") && digits.length >= 10) return `+61${digits.slice(1)}`;
  return value?.trim() || null;
}

function truncateError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown error";
  return message.slice(0, 500);
}

function hasTwilioSmsConfig() {
  return Boolean(
    Deno.env.get("TWILIO_ACCOUNT_SID")?.trim() && Deno.env.get("TWILIO_AUTH_TOKEN")?.trim()
  );
}

async function getUserPlanKey({
  supabase,
  userId,
  cache,
}: {
  supabase: ReturnType<typeof createAdminClient>;
  userId: string;
  cache: Map<string, SubscriptionPlanKey>;
}) {
  const cached = cache.get(userId);
  if (cached) return cached;

  const { data, error } = await supabase
    .from("profiles")
    .select("subscription_plan_key, subscription_status, subscription_tier")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;

  const profile = data as SubscriptionProfile | null;
  const planKey = getEffectiveSubscriptionPlanKey({
    subscriptionPlanKey: profile?.subscription_plan_key,
    subscriptionTier: profile?.subscription_tier,
    subscriptionStatus: profile?.subscription_status,
  });
  cache.set(userId, planKey);
  return planKey;
}

function isMissingLeadSmsTrackingColumnError(error: unknown) {
  if (!error || typeof error !== "object" || !("message" in error)) return false;
  return /sms_(do_not_contact|opted_out)/i.test(String(error.message));
}

async function getConvertedLeadSmsSuppression({
  jobId,
  supabase,
}: {
  jobId: string | null | undefined;
  supabase: ReturnType<typeof createAdminClient>;
}): Promise<SmsSuppressionState> {
  if (!jobId) return { reason: null, suppressed: false };

  const { data, error } = await supabase
    .from("leads")
    .select("id, sms_do_not_contact, sms_do_not_contact_reason")
    .eq("converted_job_id", jobId)
    .eq("sms_do_not_contact", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (isMissingLeadSmsTrackingColumnError(error)) return { reason: null, suppressed: false };
    throw error;
  }

  return {
    reason: data?.sms_do_not_contact_reason || null,
    suppressed: Boolean(data?.sms_do_not_contact),
  };
}

async function getBusinessIdForUser({
  supabase,
  userId,
}: {
  supabase: ReturnType<typeof createAdminClient>;
  userId: string;
}) {
  const { data, error } = await supabase
    .from("business_profile")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return (data as { id?: string } | null)?.id || null;
}

async function getPhoneSmsSuppression({
  businessId,
  phone,
  supabase,
}: {
  businessId: string | null | undefined;
  phone: string | null | undefined;
  supabase: ReturnType<typeof createAdminClient>;
}): Promise<SmsSuppressionState> {
  if (!businessId || !phone) return { reason: null, suppressed: false };

  const { data, error } = await supabase.rpc("is_sms_suppressed", {
    p_business_id: businessId,
    p_phone: phone,
  });

  if (error) {
    // Fall back to converted-lead flag until the hardening migration is applied.
    console.warn("is_sms_suppressed unavailable", error.message);
    return { reason: null, suppressed: false };
  }

  return {
    reason: data ? "phone_sms_suppression" : null,
    suppressed: Boolean(data),
  };
}

async function resolveSmsSuppression({
  jobId,
  phone,
  supabase,
  userId,
}: {
  jobId: string | null | undefined;
  phone: string | null | undefined;
  supabase: ReturnType<typeof createAdminClient>;
  userId: string;
}): Promise<SmsSuppressionState> {
  const businessId = await getBusinessIdForUser({ supabase, userId });
  const phoneSuppression = await getPhoneSmsSuppression({
    businessId,
    phone,
    supabase,
  });
  if (phoneSuppression.suppressed) {
    return phoneSuppression;
  }

  return getConvertedLeadSmsSuppression({ jobId, supabase });
}

async function getInvoiceJobId({
  invoiceId,
  supabase,
  userId,
}: {
  invoiceId: string;
  supabase: ReturnType<typeof createAdminClient>;
  userId: string;
}) {
  const { data, error } = await supabase
    .from("invoices")
    .select("job_id")
    .eq("id", invoiceId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data?.job_id || null;
}

async function sendTwilioSms({
  body,
  fromNumber,
  toNumber,
}: {
  body: string;
  fromNumber: string;
  toNumber: string;
}) {
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID")?.trim();
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN")?.trim();

  if (!accountSid || !authToken) throw new Error("Twilio SMS delivery is not configured");

  const client = twilio(accountSid, authToken);
  try {
    return await client.messages.create({ body, from: fromNumber, to: toNumber });
  } catch (err) {
    const supabase = createAdminClient();
    await supabase.from("webhook_failures").insert({
      provider: "twilio",
      payload: { body, from: fromNumber, to: toNumber },
      error_message: String(err).slice(0, 500),
    });
    throw err;
  }
}

async function sendAutomationEmail({
  businessName,
  fallbackReplyTo,
  message,
  replyToEmail,
  subject,
  toEmail,
}: {
  businessName: string;
  fallbackReplyTo?: string;
  message: string;
  replyToEmail?: string | null;
  subject: string;
  toEmail: string;
}) {
  const resend = getResend();
  const senderEmail = getResendSenderEmail();
  const resolvedReplyTo = replyToEmail || fallbackReplyTo;

  const payload = {
    from: senderEmail,
    ...(resolvedReplyTo ? { replyTo: resolvedReplyTo } : {}),
    to: [toEmail],
    subject,
    text: message,
    html: buildHtmlEmail(message, businessName),
  };

  const { error: emailError } = await resend.emails.send(payload);

  if (emailError) {
    const supabase = createAdminClient();
    await supabase.from("webhook_failures").insert({
      provider: "resend",
      payload,
      error_message: String(emailError.message).slice(0, 500),
    });
    throw new Error(emailError.message || "Failed to send automation email");
  }
}

async function processQuoteFollowups({
  supabase,
  fallbackReplyTo,
}: {
  supabase: ReturnType<typeof createAdminClient>;
  fallbackReplyTo?: string;
}) {
  const planCache = new Map<string, SubscriptionPlanKey>();
  const { data, error } = await supabase.rpc("claim_due_quote_followups", { limit_count: 50 });

  if (error) throw new Error(error.message || "Failed to claim quote follow-ups");

  const results: DispatchResults = { processed: 0, sent: 0, errors: 0 };

  for (const followup of (data || []) as ClaimedQuoteFollowup[]) {
    results.processed += 1;
    try {
      const planKey = await getUserPlanKey({ supabase, userId: followup.user_id, cache: planCache });
      if (!hasApexAutomationAccess(planKey)) {
        throw new Error("Apex plan required for quote nurture automation");
      }

      const businessName = followup.business_name || "TradieFlow";
      const message = renderAutomationTemplate(
        coerceAutomationTemplate(followup.quote_followup_template, DEFAULT_QUOTE_FOLLOWUP_TEMPLATE),
        {
          business_name: businessName,
          contact_name: followup.client_name,
          job_title: followup.job_title,
          quote_amount: formatMoney(followup.job_price),
        }
      );
      const replyToEmail = followup.reply_to_email || fallbackReplyTo;
      const smsFromNumber = normalizeAustralianPhone(followup.twilio_phone_number);
      const smsToNumber = normalizeAustralianPhone(followup.client_phone);
      const smsSuppression = await resolveSmsSuppression({
        jobId: followup.job_id,
        phone: followup.client_phone,
        supabase,
        userId: followup.user_id,
      });
      const canSendSms = Boolean(hasTwilioSmsConfig() && smsFromNumber && smsToNumber && !smsSuppression.suppressed);

      if (canSendSms && smsFromNumber && smsToNumber) {
        await sendTwilioSms({ body: message, fromNumber: smsFromNumber, toNumber: smsToNumber });
      } else if (followup.client_email) {
        await sendAutomationEmail({
          businessName,
          fallbackReplyTo,
          message,
          replyToEmail,
          subject: `Quick quote follow-up from ${businessName}`,
          toEmail: followup.client_email,
        });
      } else {
        throw new Error(
          smsSuppression.suppressed
            ? "Quote follow-up SMS suppressed because the converted lead opted out, and no email fallback is available"
            : "No SMS-capable mobile or email address available for quote follow-up delivery"
        );
      }

      results.sent += 1;
      await supabase
        .from("jobs")
        .update({
          quote_followup_sent_at: new Date().toISOString(),
          quote_followup_processing: false,
          quote_followup_processing_started_at: null,
          quote_followup_last_error: null,
        })
        .eq("id", followup.job_id)
        .eq("user_id", followup.user_id);
    } catch (error) {
      results.errors += 1;
      console.error(`Error processing quote follow-up ${followup.job_id}:`, error);
      await supabase
        .from("jobs")
        .update({
          quote_followup_processing: false,
          quote_followup_processing_started_at: null,
          quote_followup_last_error: truncateError(error),
        })
        .eq("id", followup.job_id)
        .eq("user_id", followup.user_id);
    }
  }

  return results;
}

async function processReviewRequests({
  supabase,
  fallbackReplyTo,
}: {
  supabase: ReturnType<typeof createAdminClient>;
  fallbackReplyTo?: string;
}) {
  const planCache = new Map<string, SubscriptionPlanKey>();
  const { data, error } = await supabase.rpc("claim_due_review_requests", { limit_count: 50 });

  if (error) throw new Error(error.message || "Failed to claim review requests");

  const results: DispatchResults = { processed: 0, sent: 0, errors: 0 };

  for (const reviewRequest of (data || []) as ClaimedReviewRequest[]) {
    results.processed += 1;
    try {
      const planKey = await getUserPlanKey({ supabase, userId: reviewRequest.user_id, cache: planCache });
      if (!hasApexAutomationAccess(planKey)) {
        throw new Error("Apex plan required for review extraction automation");
      }

      const businessName = reviewRequest.business_name || "TradieFlow";
      const message = renderAutomationTemplate(
        coerceAutomationTemplate(reviewRequest.review_request_template, DEFAULT_REVIEW_REQUEST_TEMPLATE),
        {
          business_name: businessName,
          contact_name: reviewRequest.client_name,
          google_review_url: reviewRequest.google_review_url,
          invoice_amount: formatMoney(reviewRequest.invoice_amount),
          job_title: reviewRequest.job_title,
        }
      );
      const replyToEmail = reviewRequest.reply_to_email || fallbackReplyTo;
      const smsFromNumber = normalizeAustralianPhone(reviewRequest.twilio_phone_number);
      const smsToNumber = normalizeAustralianPhone(reviewRequest.client_phone);
      const invoiceJobId = await getInvoiceJobId({ invoiceId: reviewRequest.invoice_id, supabase, userId: reviewRequest.user_id });
      const smsSuppression = await resolveSmsSuppression({
        jobId: invoiceJobId,
        phone: reviewRequest.client_phone,
        supabase,
        userId: reviewRequest.user_id,
      });
      const canSendSms = Boolean(hasTwilioSmsConfig() && smsFromNumber && smsToNumber && !smsSuppression.suppressed);

      if (canSendSms && smsFromNumber && smsToNumber) {
        await sendTwilioSms({ body: message, fromNumber: smsFromNumber, toNumber: smsToNumber });
      } else if (reviewRequest.client_email) {
        await sendAutomationEmail({
          businessName,
          fallbackReplyTo,
          message,
          replyToEmail,
          subject: `Thanks from ${businessName}`,
          toEmail: reviewRequest.client_email,
        });
      } else {
        throw new Error(
          smsSuppression.suppressed
            ? "Review request SMS suppressed because the converted lead opted out, and no email fallback is available"
            : "No SMS-capable mobile or email address available for review request delivery"
        );
      }

      results.sent += 1;
      await supabase
        .from("invoices")
        .update({
          review_request_sent_at: new Date().toISOString(),
          review_request_processing: false,
          review_request_processing_started_at: null,
          review_request_last_error: null,
        })
        .eq("id", reviewRequest.invoice_id)
        .eq("user_id", reviewRequest.user_id);
    } catch (error) {
      results.errors += 1;
      console.error(`Error processing review request ${reviewRequest.invoice_id}:`, error);
      await supabase
        .from("invoices")
        .update({
          review_request_processing: false,
          review_request_processing_started_at: null,
          review_request_last_error: truncateError(error),
        })
        .eq("id", reviewRequest.invoice_id)
        .eq("user_id", reviewRequest.user_id);
    }
  }

  return results;
}

async function handleZeroLeakRequest(request: Request) {
  const cronSecrets = getCronSecrets();
  const cronSecretSources = getCronSecretSources();
  const authHeader = request.headers.get("authorization");
  const bearerSecret = normalizeIncomingSecret(authHeader?.replace(/^Bearer\s+/i, "") || null);
  const headerSecret = normalizeIncomingSecret(request.headers.get("x-cron-secret"));

  if (cronSecrets.length === 0) {
    return jsonResponse(
      { error: "Zero-Leak cron route not configured" },
      500,
      { "X-TradieFlow-Zero-Leak-Secret-Count": "0", "X-TradieFlow-Zero-Leak-Secret-Sources": "none" }
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
        "X-TradieFlow-Zero-Leak-Secret-Count": String(cronSecrets.length),
        "X-TradieFlow-Zero-Leak-Secret-Sources": cronSecretSources.join(",") || "none",
      }
    );
  }

  try {
    const supabase = createAdminClient();
    const fallbackReplyTo = Deno.env.get("RESEND_REPLY_TO_EMAIL") || undefined;

    const [quoteFollowups, reviewRequests] = await Promise.all([
      processQuoteFollowups({ supabase, fallbackReplyTo }),
      processReviewRequests({ supabase, fallbackReplyTo }),
    ]);

    return jsonResponse(
      {
        success: true,
        results: { quoteFollowups, reviewRequests },
        timestamp: new Date().toISOString(),
        source: "zero-leak-cron-route",
        method: request.method,
      },
      200,
      {
        "X-TradieFlow-Zero-Leak-Secret-Count": String(cronSecrets.length),
        "X-TradieFlow-Zero-Leak-Secret-Sources": cronSecretSources.join(",") || "none",
      }
    );
  } catch (error) {
    console.error("Zero-Leak cron route error:", error);
    return jsonResponse(
      {
        error: "Zero-Leak automation failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500,
      {
        "X-TradieFlow-Zero-Leak-Secret-Count": String(cronSecrets.length),
        "X-TradieFlow-Zero-Leak-Secret-Sources": cronSecretSources.join(",") || "none",
      }
    );
  }
}

serve(async (req) => {
  try {
    return await handleZeroLeakRequest(req);
  } catch (err) {
    return new Response(String(err), { status: 500 });
  }
});
