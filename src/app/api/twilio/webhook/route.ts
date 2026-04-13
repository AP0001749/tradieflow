import { NextResponse } from "next/server";
import twilio from "twilio";

import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type LeadMatch = {
  id: string;
  job_type: string | null;
  phone: string | null;
  sms_last_inbound_sid?: string | null;
  status: string;
};

type BusinessSmsProfile = {
  id: string;
  twilio_phone_number: string | null;
};

type InboundIntent =
  | "opt_out"
  | "pricing"
  | "interested"
  | "question"
  | "wrong_number"
  | "other";

const OPT_OUT_PATTERN = /^(stop|stopall|unsubscribe|cancel|end|quit)$/i;
const WRONG_NUMBER_PATTERN = /(wrong number|not (me|interested)|don't text|do not text)/i;
const PRICING_PATTERN = /(price|pricing|cost|how much|quote|fee|monthly)/i;
const INTEREST_PATTERN = /(yes|keen|interested|call me|let'?s chat|demo|book|sounds good)/i;
const QUESTION_PATTERN = /\?/;

function xmlResponse(body = "<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response></Response>") {
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/xml",
    },
  });
}

function getPhoneDigits(value: string | null | undefined) {
  return (value || "").replace(/\D+/g, "");
}

function normalizeAustralianMobile(value: string | null | undefined) {
  const digits = getPhoneDigits(value);

  if (!digits) {
    return null;
  }

  if (digits.startsWith("61") && digits.length >= 11) {
    return `+${digits}`;
  }

  if (digits.startsWith("0") && digits.length >= 10) {
    return `+61${digits.slice(1)}`;
  }

  return value?.trim() || null;
}

function getLocalMobileVariant(value: string | null | undefined) {
  const digits = getPhoneDigits(value);

  if (digits.startsWith("61") && digits.length >= 11) {
    return `0${digits.slice(2)}`;
  }

  if (digits.startsWith("0") && digits.length >= 10) {
    return digits;
  }

  return digits || null;
}

function buildPhoneSearchTerms(fromNumber: string) {
  const terms = new Set<string>();
  const normalized = normalizeAustralianMobile(fromNumber);
  const local = getLocalMobileVariant(fromNumber);
  const digits = getPhoneDigits(fromNumber);

  [normalized, local, digits].forEach((value) => {
    if (!value) {
      return;
    }

    const compact = value.replace(/^\+/, "");
    if (compact.length >= 8) {
      terms.add(compact);
      terms.add(compact.slice(-10));
      terms.add(compact.slice(-9));
    }
  });

  return Array.from(terms).filter((value) => value.length >= 8);
}

function phoneNumbersMatch(left: string | null | undefined, right: string | null | undefined) {
  const leftDigits = getPhoneDigits(left);
  const rightDigits = getPhoneDigits(right);

  if (!leftDigits || !rightDigits) {
    return false;
  }

  return leftDigits === rightDigits || leftDigits.endsWith(rightDigits.slice(-9));
}

function classifyInboundIntent(messageBody: string): InboundIntent {
  const message = messageBody.trim();

  if (!message) {
    return "other";
  }

  if (OPT_OUT_PATTERN.test(message)) {
    return "opt_out";
  }

  if (WRONG_NUMBER_PATTERN.test(message)) {
    return "wrong_number";
  }

  if (PRICING_PATTERN.test(message)) {
    return "pricing";
  }

  if (INTEREST_PATTERN.test(message)) {
    return "interested";
  }

  if (QUESTION_PATTERN.test(message)) {
    return "question";
  }

  return "other";
}

function getRequestUrlCandidates(request: Request) {
  const url = new URL(request.url);
  const candidates = new Set<string>([request.url]);
  const forwardedHost = request.headers.get("x-forwarded-host")?.trim();
  const forwardedProto =
    request.headers.get("x-forwarded-proto")?.trim() ||
    url.protocol.replace(":", "");

  if (forwardedHost) {
    candidates.add(`${forwardedProto}://${forwardedHost}${url.pathname}${url.search}`);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (appUrl) {
    candidates.add(`${appUrl.replace(/\/+$/, "")}${url.pathname}${url.search}`);
  }

  return Array.from(candidates);
}

function isTwilioRequestValid(request: Request, params: Record<string, string>) {
  if (process.env.TWILIO_SKIP_SIGNATURE_VALIDATION === "true") {
    return true;
  }

  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const signature = request.headers.get("x-twilio-signature")?.trim();

  if (!authToken || !signature) {
    return false;
  }

  return getRequestUrlCandidates(request).some((url) =>
    twilio.validateRequest(authToken, signature, url, params),
  );
}

function isMissingLeadSmsTrackingColumnError(error: unknown) {
  if (!error || typeof error !== "object" || !("message" in error)) {
    return false;
  }

  return /sms_(do_not_contact|last_inbound|opted_out)/i.test(String(error.message));
}

async function updateLeadWithSmsFallback(
  leadId: string,
  updatePayload: Record<string, unknown>,
) {
  const supabase = createAdminClient();

  const runUpdate = async (payload: Record<string, unknown>) =>
    supabase.from("leads").update(payload).eq("id", leadId);

  let { error } = await runUpdate(updatePayload);

  if (error && isMissingLeadSmsTrackingColumnError(error)) {
    console.warn(
      "Lead SMS tracking columns are missing; retrying Twilio webhook update without SMS fields.",
    );

    const fallbackPayload = { ...updatePayload };
    delete fallbackPayload.sms_do_not_contact;
    delete fallbackPayload.sms_do_not_contact_reason;
    delete fallbackPayload.sms_last_inbound_at;
    delete fallbackPayload.sms_last_inbound_from;
    delete fallbackPayload.sms_last_inbound_intent;
    delete fallbackPayload.sms_last_inbound_message;
    delete fallbackPayload.sms_last_inbound_sid;
    delete fallbackPayload.sms_opted_out_at;

    ({ error } = await runUpdate(fallbackPayload));
  }

  if (error) {
    throw error;
  }
}

async function findBusinessProfileByTwilioNumber(toNumber: string) {
  const searchTerms = buildPhoneSearchTerms(toNumber);

  if (searchTerms.length === 0) {
    return null;
  }

  const supabase = createAdminClient();
  const orFilter = searchTerms
    .map((term) => `twilio_phone_number.ilike.*${term.replace(/[^0-9]/g, "")}*`)
    .join(",");

  const { data, error } = await supabase
    .from("business_profile")
    .select("id, twilio_phone_number")
    .not("twilio_phone_number", "is", null)
    .or(orFilter)
    .limit(20);

  if (error) {
    throw error;
  }

  return (
    ((data || []) as BusinessSmsProfile[]).find((profile) =>
      phoneNumbersMatch(profile.twilio_phone_number, toNumber),
    ) || null
  );
}

async function findLeadByPhone(businessId: string, fromNumber: string) {
  const searchTerms = buildPhoneSearchTerms(fromNumber);

  if (searchTerms.length === 0) {
    return null;
  }

  const supabase = createAdminClient();
  const orFilter = searchTerms
    .map((term) => `phone.ilike.*${term.replace(/[^0-9]/g, "")}*`)
    .join(",");

  const runSelect = async (includeSmsTrackingFields: boolean) =>
    supabase
      .from("leads")
      .select(
        includeSmsTrackingFields
          ? "id, phone, status, job_type, sms_last_inbound_sid"
          : "id, phone, status, job_type",
      )
      .eq("business_id", businessId)
      .not("phone", "is", null)
      .or(orFilter)
      .order("created_at", { ascending: false })
      .limit(20);

  let { data, error } = await runSelect(true);

  if (error && isMissingLeadSmsTrackingColumnError(error)) {
    console.warn(
      "Lead SMS tracking columns are missing; retrying Twilio lead lookup without SMS fields.",
    );

    ({ data, error } = await runSelect(false));
  }

  if (error) {
    throw error;
  }

  const normalizedFromDigits = getPhoneDigits(fromNumber);

  return (
    (data as LeadMatch[] | null)?.find((lead) => {
      const leadDigits = getPhoneDigits(lead.phone);

      return (
        leadDigits === normalizedFromDigits ||
        leadDigits.endsWith(normalizedFromDigits.slice(-9))
      );
    }) || null
  );
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const params = Object.fromEntries(
      Array.from(formData.entries()).map(([key, value]) => [key, String(value)]),
    );

    if (!isTwilioRequestValid(request, params)) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = params.Body?.trim() || "";
    const fromNumber = params.From?.trim() || "";
    const toNumber = params.To?.trim() || "";
    const messageSid = params.MessageSid?.trim() || "";
    const optOutType = params.OptOutType?.trim() || "";

    if (!fromNumber || !messageSid) {
      return xmlResponse();
    }

    const intent: InboundIntent =
      optOutType || OPT_OUT_PATTERN.test(body)
        ? "opt_out"
        : classifyInboundIntent(body);

    if (!toNumber) {
      return xmlResponse();
    }

    const businessProfile = await findBusinessProfileByTwilioNumber(toNumber);

    if (!businessProfile) {
      console.warn("Twilio inbound SMS did not match a business profile", {
        fromNumber,
        messageSid,
        toNumber,
      });
      return xmlResponse();
    }

    const lead = await findLeadByPhone(businessProfile.id, fromNumber);

    if (!lead) {
      console.warn("Twilio inbound SMS did not match an existing lead", {
        businessId: businessProfile.id,
        fromNumber,
        messageSid,
        toNumber,
      });
      return xmlResponse();
    }

    if (lead.sms_last_inbound_sid === messageSid) {
      return xmlResponse();
    }

    const now = new Date().toISOString();
    const updatePayload: Record<string, unknown> = {
      last_contacted_at: now,
      next_followup_at: null,
      processing: false,
      processing_started_at: null,
      sms_last_inbound_at: now,
      sms_last_inbound_from: fromNumber,
      sms_last_inbound_intent: intent,
      sms_last_inbound_message: body || null,
      sms_last_inbound_sid: messageSid,
      updated_at: now,
    };

    if (intent === "opt_out" || intent === "wrong_number") {
      updatePayload.sms_do_not_contact = true;
      updatePayload.sms_do_not_contact_reason =
        intent === "wrong_number"
          ? "wrong_number_reply"
          : optOutType || body || "STOP";

      if (intent === "opt_out") {
        updatePayload.sms_opted_out_at = now;
      }
    } else if (lead.status === "new" || lead.status === "stale") {
      updatePayload.status = "contacted";
    }

    await updateLeadWithSmsFallback(lead.id, updatePayload);

    const supabase = createAdminClient();

    const { error: eventError } = await supabase.from("lead_events").insert({
      lead_id: lead.id,
      event_type:
        intent === "opt_out"
          ? "sms_opt_out"
          : intent === "wrong_number"
            ? "sms_wrong_number_suppressed"
            : "sms_received",
      meta: {
        body,
        business_id: businessProfile.id,
        from: fromNumber,
        intent,
        job_type: lead.job_type,
        message_sid: messageSid,
        opt_out_type: optOutType || null,
        source: "twilio-webhook",
        to: toNumber || null,
      },
    });

    if (eventError) {
      throw eventError;
    }

    return xmlResponse();
  } catch (error) {
    console.error("Twilio webhook processing failed", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
