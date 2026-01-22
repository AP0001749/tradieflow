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

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        const response = NextResponse.next();
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
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

  const response = NextResponse.redirect(new URL(redirectPath, requestUrl.origin));
  
  // Set cookies for the redirect response
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    response.cookies.set('sb-access-token', session.access_token, {
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax',
    });
    response.cookies.set('sb-refresh-token', session.refresh_token, {
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax',
    });
  }

  return response;
}
