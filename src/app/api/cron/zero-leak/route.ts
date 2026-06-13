import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function cleanEnv(value: string | undefined) {
  return value?.trim().replace(/\/+$/, "") || "";
}

function getCronSecrets() {
  return [
    cleanEnv(process.env.LEAD_FOLLOWUP_SECRET),
    cleanEnv(process.env.CRON_SECRET),
  ].filter(Boolean);
}

function getHeaderSecret(request: NextRequest) {
  const cronSecret = request.headers.get("x-cron-secret")?.trim();
  const bearerSecret = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "")
    .trim();

  return cronSecret || bearerSecret || "";
}

function isAuthorized(request: NextRequest) {
  const acceptedSecrets = getCronSecrets();
  const headerSecret = getHeaderSecret(request);

  return acceptedSecrets.length > 0 && acceptedSecrets.includes(headerSecret);
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const supabaseAnonKey = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const cronSecret = getHeaderSecret(request);

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { error: "Missing Supabase Edge Function configuration" },
      { status: 500 },
    );
  }

  const edgeUrl = `${supabaseUrl}/functions/v1/zero-leak`;

  // Apex plan required for quote nurture automation.
  // Apex plan required for review extraction automation.
  const response = await fetch(edgeUrl, {
    method: "POST",
    headers: {
      authorization: `Bearer ${supabaseAnonKey}`,
      "content-type": "application/json",
      "x-cron-secret": cronSecret,
    },
    body: JSON.stringify({ source: "next-cron-zero-leak" }),
    cache: "no-store",
  });

  const body = await response.text();
  const contentType = response.headers.get("content-type") || "application/json";

  return new NextResponse(body, {
    status: response.status,
    headers: {
      "content-type": contentType,
      "x-tradieflow-zero-leak-route": "next-edge-proxy",
    },
  });
}
