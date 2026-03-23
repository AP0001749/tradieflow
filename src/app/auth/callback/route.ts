import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/login", requestUrl.origin));
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.redirect(new URL("/login", requestUrl.origin));
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
    return NextResponse.redirect(new URL("/login", requestUrl.origin));
  }

  // Check if this is a new user (created in the last 10 seconds)
  if (data.user) {
    const createdAt = new Date(data.user.created_at);
    const now = new Date();
    const isNewUser = (now.getTime() - createdAt.getTime()) < 10000; // 10 seconds

    if (isNewUser) {
      redirectPath = "/welcome";
    }
  }

  // Build the redirect response and apply auth cookies
  const response = NextResponse.redirect(new URL(redirectPath, requestUrl.origin));
  for (const { name, value, options } of cookiesToSet) {
    response.cookies.set(name, value, options);
  }

  return response;
}
