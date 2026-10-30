import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getAppOrigin } from "@/lib/app-origin";
import { ensureProfileExists } from "@/lib/profiles";

function getCallbackOrigin(requestUrl: URL) {
  try {
    return getAppOrigin();
  } catch {
    return requestUrl.origin;
  }
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const origin = getCallbackOrigin(requestUrl);
  const code = requestUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=auth", origin));
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.redirect(new URL("/login?error=config", origin));
  }

  let redirectPath = "/dashboard";

  // Collect cookies set by supabase auth so they can be applied to the
  // final response regardless of which redirect path is chosen.
  const cookiesToSet: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookies) {
        cookiesToSet.push(...cookies);
      },
    },
  });

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL("/login?error=auth", origin));
  }

  // Ensure the app profile exists before redirecting into billing/dashboard flows.
  if (data.user) {
    const profileResult = await ensureProfileExists(data.user);
    const isNewUser = profileResult.created;

    if (isNewUser) {
      redirectPath = "/welcome";
    }
  }

  // Build the redirect response and apply auth cookies
  const response = NextResponse.redirect(new URL(redirectPath, origin));
  for (const { name, value, options } of cookiesToSet) {
    response.cookies.set(name, value, options);
  }

  return response;
}
