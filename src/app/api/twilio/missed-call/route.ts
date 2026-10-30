import { NextResponse } from "next/server";
import twilio from "twilio";

import { createAdminClient } from "@/lib/supabase/admin";
import { buildLeadResponseDueAt } from "@/lib/lead-triage";
import {
  getEffectiveSubscriptionPlanKey,
  hasBaselineAutomationAccess,
} from "@/lib/pricing";
import {
  isPhoneSmsSuppressed,
} from "@/lib/sms-suppression";
import {
  DEFAULT_MISSED_CALL_TEXT_TEMPLATE,
  coerceAutomationTemplate,
  renderAutomationTemplate,
} from "@/lib/zero-leak";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MISSED_DIAL_STATUSES = new Set(["busy", "no-answer", "failed", "canceled"]);
const CLOSED_LEAD_STATUSES = new Set(["won", "lost", "stale"]);

type BusinessMissedCallProfile = {
  id: string;
  user_id: string;
  business_name: string;
  emergency_response_sla_minutes: number | null;
  missed_call_text_enabled: boolean;
  missed_call_text_template: string | null;
  quote_response_sla_minutes: number | null;
  same_day_response_sla_minutes: number | null;
  scheduled_response_sla_minutes: number | null;
  twilio_phone_number: string | null;
};

type LeadMatch = {
  id: string;
  name: string;
  phone: string | null;
  status: string;
  first_responded_at?: string | null;
  lead_urgency?: string | null;
  response_due_at?: string | null;
  sms_do_not_contact?: boolean | null;
  triage_problem?: string | null;
};

type MissedCallTextBackClaim = {
  should_send: boolean;
  claim_status: string;
};

type SubscriptionProfile = {
  subscription_plan_key: string | null;
  subscription_status: string | null;
  subscription_tier: string | null;
};

function twimlResponse(body = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>') {
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

function normalizeAustralianPhone(value: string | null | undefined) {
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

function buildPhoneSearchTerms(value: string) {
  const terms = new Set<string>();
  const normalized = normalizeAustralianPhone(value);
  const digits = getPhoneDigits(value);

  [normalized, digits].forEach((term) => {
    if (!term) {
      return;
    }

    const compact = term.replace(/^\+/, "");
    if (compact.length >= 8) {
      terms.add(compact);
      terms.add(compact.slice(-10));
      terms.add(compact.slice(-9));
    }
  });

  return Array.from(terms).filter((term) => term.length >= 8);
}

function phoneNumbersMatch(left: string | null | undefined, right: string | null | undefined) {
  const leftDigits = getPhoneDigits(left);
  const rightDigits = getPhoneDigits(right);

  if (!leftDigits || !rightDigits) {
    return false;
  }

  return leftDigits === rightDigits || leftDigits.endsWith(rightDigits.slice(-9));
}

function isCallablePhoneNumber(value: string | null | undefined) {
  if (!value || /^anonymous$/i.test(value.trim())) {
    return false;
  }

  return getPhoneDigits(value).length >= 8;
}

function isClosedLeadStatus(status: string | null | undefined) {
  return CLOSED_LEAD_STATUSES.has(status || "");
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
    twilio.validateRequest(authToken, signature, url, params)
  );
}

async function findBusinessProfile(businessId: string, toNumber: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("business_profile")
    .select("id, user_id, business_name, emergency_response_sla_minutes, same_day_response_sla_minutes, scheduled_response_sla_minutes, quote_response_sla_minutes, missed_call_text_enabled, missed_call_text_template, twilio_phone_number")
    .eq("id", businessId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const profile = data as BusinessMissedCallProfile | null;

  if (!profile || !phoneNumbersMatch(profile.twilio_phone_number, toNumber)) {
    return null;
  }

  return profile;
}

async function hasMissedCallTextBackAccess(userId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("subscription_tier, subscription_plan_key, subscription_status")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const profile = data as SubscriptionProfile | null;
  const planKey = getEffectiveSubscriptionPlanKey({
    subscriptionPlanKey: profile?.subscription_plan_key,
    subscriptionTier: profile?.subscription_tier,
    subscriptionStatus: profile?.subscription_status,
  });

  return hasBaselineAutomationAccess(planKey);
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

  const { data, error } = await supabase
    .from("leads")
    .select("id, name, phone, status, first_responded_at, lead_urgency, response_due_at, sms_do_not_contact, triage_problem")
    .eq("business_id", businessId)
    .not("phone", "is", null)
    .or(orFilter)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    throw error;
  }

  return (
    ((data || []) as LeadMatch[]).find((lead) =>
      phoneNumbersMatch(lead.phone, fromNumber)
    ) || null
  );
}

async function getOrCreateMissedCallLead(
  businessId: string,
  fromNumber: string,
  callSid: string,
  responseDueAt: string,
) {
  const existingLead = await findLeadByPhone(businessId, fromNumber);

  if (existingLead && !isClosedLeadStatus(existingLead.status)) {
    return existingLead;
  }

  const phoneSuppressed = await isPhoneSmsSuppressed({
    businessId,
    phone: fromNumber,
  });
  const inheritedSuppression =
    Boolean(existingLead?.sms_do_not_contact) || phoneSuppressed;

  const supabase = createAdminClient();
  const closedLeadContext = existingLead
    ? ` Prior closed lead: ${existingLead.id} (${existingLead.status}).`
    : "";
  const { data, error } = await supabase
    .from("leads")
    .insert({
      business_id: businessId,
      name: existingLead?.name || `Missed call ${fromNumber}`,
      phone: normalizeAustralianPhone(fromNumber) || fromNumber,
      source: "missed_call_text_back",
      status: "new",
      lead_urgency: "emergency",
      response_due_at: responseDueAt,
      triage_problem: "Missed inbound call requiring text-back recovery.",
      followup_step: 0,
      next_followup_at: null,
      sms_do_not_contact: inheritedSuppression,
      sms_do_not_contact_reason: inheritedSuppression
        ? "inherited_phone_suppression"
        : null,
      notes: `Inbound call missed. Twilio CallSid: ${callSid || "unknown"}.${closedLeadContext}`,
    })
    .select("id, name, phone, status, first_responded_at, lead_urgency, response_due_at, sms_do_not_contact, triage_problem")
    .single();

  if (error) {
    throw error;
  }

  return data as LeadMatch;
}

async function escalateLeadForMissedCall({
  callSid,
  dialStatus,
  fromNumber,
  lead,
  responseDueAt,
  toNumber,
}: {
  callSid: string;
  dialStatus: string;
  fromNumber: string;
  lead: LeadMatch;
  responseDueAt: string;
  toNumber: string;
}) {
  const supabase = createAdminClient();
  const isClosed = isClosedLeadStatus(lead.status);
  const previousProblem = lead.triage_problem?.trim();
  const missedCallProblem = "Missed inbound call requiring text-back recovery.";
  const nextProblem =
    previousProblem && !previousProblem.includes(missedCallProblem)
      ? `${missedCallProblem} ${previousProblem}`.slice(0, 1000)
      : previousProblem || missedCallProblem;
  const updatePayload: Record<string, unknown> = {
    lead_urgency: "emergency",
    triage_problem: nextProblem,
  };

  if (!lead.first_responded_at && !isClosed) {
    updatePayload.response_due_at = responseDueAt;
  }

  const { error } = await supabase
    .from("leads")
    .update(updatePayload)
    .eq("id", lead.id);

  if (error) {
    throw error;
  }

  await insertLeadEvent(lead.id, "missed_call_escalated", {
    call_sid: callSid,
    dial_status: dialStatus,
    from: fromNumber,
    previous_response_due_at: lead.response_due_at || null,
    previous_urgency: lead.lead_urgency || null,
    response_due_at: updatePayload.response_due_at || lead.response_due_at || null,
    source: "twilio-missed-call",
    to: toNumber,
  });
}

async function insertLeadEvent(
  leadId: string,
  eventType: string,
  meta: Record<string, unknown>
) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("lead_events").insert({
    lead_id: leadId,
    event_type: eventType,
    meta,
  });

  if (error) {
    throw error;
  }
}

async function claimMissedCallTextBack({
  businessId,
  callSid,
  dialStatus,
  fromNumber,
  leadId,
  toNumber,
}: {
  businessId: string;
  callSid: string;
  dialStatus: string;
  fromNumber: string;
  leadId: string;
  toNumber: string;
}) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("claim_missed_call_text_back", {
    p_business_id: businessId,
    p_call_sid: callSid,
    p_dial_status: dialStatus,
    p_from_number: fromNumber,
    p_lead_id: leadId,
    p_to_number: toNumber,
  });

  if (error) {
    throw error;
  }

  const claim = (data || [])[0] as MissedCallTextBackClaim | undefined;
  return Boolean(claim?.should_send);
}

async function markMissedCallTextBackStatus({
  callSid,
  lastError = null,
  messageSid = null,
  status,
}: {
  callSid: string;
  lastError?: string | null;
  messageSid?: string | null;
  status: "sent" | "failed" | "suppressed";
}) {
  if (!callSid) {
    return;
  }

  const now = new Date().toISOString();
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("twilio_missed_call_textbacks")
    .update({
      last_error: lastError,
      sent_at: status === "sent" ? now : null,
      status,
      twilio_message_sid: messageSid,
      updated_at: now,
    })
    .eq("call_sid", callSid);

  if (error) {
    throw error;
  }
}

function truncateError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown error";
  return message.slice(0, 500);
}

async function updateLeadAfterTextBack(lead: LeadMatch) {
  const supabase = createAdminClient();
  const nextStatus = ["booked", "won"].includes(lead.status)
    ? lead.status
    : "contacted";

  const contactedAt = new Date().toISOString();
  const { error } = await supabase
    .from("leads")
    .update({
      status: nextStatus,
      last_contacted_at: contactedAt,
      first_responded_at: lead.first_responded_at || contactedAt,
      next_followup_at: null,
      processing: false,
      processing_started_at: null,
    })
    .eq("id", lead.id);

  if (error) {
    throw error;
  }
}

async function sendMissedCallText({
  body,
  businessId,
  fromNumber,
  toNumber,
}: {
  body: string;
  businessId: string;
  fromNumber: string;
  toNumber: string;
}) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();

  if (!accountSid || !authToken) {
    throw new Error("TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be configured to send missed-call text backs");
  }

  const supabase = createAdminClient();
  const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

  // Debounce check — scoped to this business so one tenant cannot suppress another.
  const { data: recentSms, error: debounceError } = await supabase
    .from("lead_sms_tracking")
    .select("id")
    .eq("business_id", businessId)
    .eq("phone_number", toNumber)
    .gte("sent_at", fifteenMinsAgo)
    .limit(1);

  if (debounceError) throw debounceError;
  if (recentSms && recentSms.length > 0) {
    console.log(
      `Debounced: An SMS was already sent to ${toNumber} for business ${businessId} within the last 15 minutes`,
    );
    return null;
  }

  const client = twilio(accountSid, authToken);
  let result;

  try {
    result = await client.messages.create({
      body,
      from: fromNumber,
      to: toNumber,
    });
  } catch (error) {
    // Keep one retry path via CallSid claim status=failed.
    // Do not also enqueue DLQ or the caller can receive duplicate SMS.
    console.error("Twilio send failed", error);
    throw error;
  }

  await supabase.from("lead_sms_tracking").insert({
    business_id: businessId,
    phone_number: toNumber,
    message_sid: result.sid,
    purpose: "missed_call_text_back",
  });

  return result;
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const params = Object.fromEntries(
    Array.from(formData.entries()).map(([key, value]) => [key, String(value)])
  );

  if (!isTwilioRequestValid(request, params)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const url = new URL(request.url);
  const businessId = url.searchParams.get("business_id")?.trim() || "";
  const dialStatus = params.DialCallStatus?.trim() || params.CallStatus?.trim() || "";
  const fromNumber = params.From?.trim() || "";
  const toNumber = params.To?.trim() || "";
  const callSid = params.CallSid?.trim() || "";

  if (
    !businessId ||
    !MISSED_DIAL_STATUSES.has(dialStatus) ||
    !isCallablePhoneNumber(fromNumber) ||
    !isCallablePhoneNumber(toNumber)
  ) {
    return twimlResponse();
  }

  try {
    const businessProfile = await findBusinessProfile(businessId, toNumber);

    if (
      !businessProfile?.missed_call_text_enabled ||
      !(await hasMissedCallTextBackAccess(businessProfile.user_id))
    ) {
      return twimlResponse();
    }

    const responseDueAt = buildLeadResponseDueAt(new Date(), "emergency", {
      emergency: businessProfile.emergency_response_sla_minutes,
      same_day: businessProfile.same_day_response_sla_minutes,
      scheduled: businessProfile.scheduled_response_sla_minutes,
      quote: businessProfile.quote_response_sla_minutes,
    });
    const lead = await getOrCreateMissedCallLead(
      businessProfile.id,
      fromNumber,
      callSid,
      responseDueAt
    );

    const shouldSend = await claimMissedCallTextBack({
      businessId: businessProfile.id,
      callSid,
      dialStatus,
      fromNumber,
      leadId: lead.id,
      toNumber,
    });

    if (!shouldSend) {
      return twimlResponse();
    }

    await escalateLeadForMissedCall({
      callSid,
      dialStatus,
      fromNumber,
      lead,
      responseDueAt,
      toNumber,
    });

    const phoneSuppressed = await isPhoneSmsSuppressed({
      businessId: businessProfile.id,
      phone: fromNumber,
    });

    if (lead.sms_do_not_contact || phoneSuppressed) {
      await markMissedCallTextBackStatus({
        callSid,
        status: "suppressed",
      });
      await insertLeadEvent(lead.id, "missed_call_text_back_suppressed", {
        call_sid: callSid,
        dial_status: dialStatus,
        from: fromNumber,
        reason: lead.sms_do_not_contact
          ? "sms_do_not_contact"
          : "phone_sms_suppression",
        source: "twilio-missed-call",
        to: toNumber,
      });

      return twimlResponse();
    }

    const message = renderAutomationTemplate(
      coerceAutomationTemplate(
        businessProfile.missed_call_text_template,
        DEFAULT_MISSED_CALL_TEXT_TEMPLATE
      ),
      {
        business_name: businessProfile.business_name,
        contact_name: lead.name,
      }
    );
    let sentMessage: Awaited<ReturnType<typeof sendMissedCallText>> | null = null;

    try {
      sentMessage = await sendMissedCallText({
        body: message,
        businessId: businessProfile.id,
        fromNumber: normalizeAustralianPhone(businessProfile.twilio_phone_number) || toNumber,
        toNumber: fromNumber,
      });
    } catch (error) {
      await markMissedCallTextBackStatus({
        callSid,
        lastError: truncateError(error),
        status: "failed",
      });

      throw error;
    }

    // Debounced sends return null — treat as success without reading .sid.
    if (!sentMessage?.sid) {
      await markMissedCallTextBackStatus({
        callSid,
        status: "sent",
      });
      return twimlResponse();
    }

    await markMissedCallTextBackStatus({
      callSid,
      messageSid: sentMessage.sid,
      status: "sent",
    });
    await updateLeadAfterTextBack(lead);
    await insertLeadEvent(lead.id, "missed_call_text_back_sent", {
      call_sid: callSid,
      dial_status: dialStatus,
      from: fromNumber,
      message_sid: sentMessage.sid,
      source: "twilio-missed-call",
      to: toNumber,
    });

    return twimlResponse();
  } catch (error) {
    console.error("Twilio missed-call text-back failed", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
