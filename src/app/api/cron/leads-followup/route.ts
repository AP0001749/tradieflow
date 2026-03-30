import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      error: "Route retired",
      message:
        "Lead follow-up now runs only through Supabase Cron and the Supabase Edge Function. This Next.js route no longer processes leads.",
    },
    { status: 410 },
  );
}
