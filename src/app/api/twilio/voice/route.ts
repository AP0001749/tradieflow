import { NextResponse } from "next/server";
import twilio from "twilio";

import { getAppOrigin } from "@/lib/app-origin";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BusinessCallProfile = {
  id: string;
  user_id: string;
  business_name: string;
  twilio_phone_number: string | null;
  missed_call_forwarding_number: string | null;
};

function twimlResponse(body: string) {
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/xml",
    },
  });
}

function emptyTwimlResponse() {
  return twimlResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
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
  const digits = getPhoneDigits(value);

  if (digits.length >= 8) {
    terms.add(digits);
    terms.add(digits.slice(-10));
    terms.add(digits.slice(-9));
  }

  const normalized = normalizeAustralianPhone(value);
  if (normalized) {
    terms.add(normalized.replace(/^\+/, ""));
  }

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
    .select("id, user_id, business_name, twilio_phone_number, missed_call_forwarding_number")
    .not("twilio_phone_number", "is", null)
    .or(orFilter)
    .limit(20);

  if (error) {
    throw error;
  }

  return (
    ((data || []) as BusinessCallProfile[]).find((profile) =>
      phoneNumbersMatch(profile.twilio_phone_number, toNumber)
    ) || null
  );
}

async function getForwardingNumber(profile: BusinessCallProfile) {
  const configuredForwardingNumber = normalizeAustralianPhone(
    profile.missed_call_forwarding_number
  );

  if (configuredForwardingNumber) {
    return configuredForwardingNumber;
  }

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("profiles")
    .select("phone")
    .eq("user_id", profile.user_id)
    .maybeSingle();

  return normalizeAustralianPhone(data?.phone);
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const params = Object.fromEntries(
      Array.from(formData.entries()).map(([key, value]) => [key, String(value)])
    );

    if (!isTwilioRequestValid(request, params)) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const toNumber = params.To?.trim() || "";

    if (!toNumber) {
      return emptyTwimlResponse();
    }

    const businessProfile = await findBusinessProfileByTwilioNumber(toNumber);

    if (!businessProfile) {
      console.warn("Twilio voice webhook did not match a business profile", {
        toNumber,
        callSid: params.CallSid || null,
      });
      return emptyTwimlResponse();
    }

    const forwardingNumber = await getForwardingNumber(businessProfile);

    if (!forwardingNumber) {
      console.warn("Twilio voice webhook has no forwarding number configured", {
        businessId: businessProfile.id,
        toNumber,
      });
      return twimlResponse(
        '<?xml version="1.0" encoding="UTF-8"?><Response><Say>We could not connect your call right now. Please send a text message to this number.</Say></Response>'
      );
    }

    const actionUrl =
      `${getAppOrigin()}/api/twilio/missed-call?business_id=${encodeURIComponent(businessProfile.id)}`;

    return twimlResponse(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Dial timeout="15" action="${escapeXml(actionUrl)}" method="POST"><Number>${escapeXml(forwardingNumber)}</Number></Dial></Response>`
    );
  } catch (error) {
    console.error("Twilio voice webhook processing failed", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
