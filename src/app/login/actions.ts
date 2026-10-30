"use server";

import { redirect } from "next/navigation";

import { getAppOrigin } from "@/lib/app-origin";
import { createClient } from "@/lib/supabase/server";

export type AuthActionResult = { error: string };

export async function signInWithGoogle(): Promise<AuthActionResult | void> {
  const supabase = await createClient();

  let origin: string;
  try {
    origin = getAppOrigin();
  } catch {
    return {
      error:
        "App URL is not configured. Set NEXT_PUBLIC_APP_URL before Google sign-in can work.",
    };
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback`,
      queryParams: {
        prompt: "select_account",
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.url) {
    redirect(data.url);
  }

  return { error: "Unable to start Google OAuth flow" };
}

export async function signInWithDemo(): Promise<AuthActionResult | void> {
  const email = process.env.DEMO_LOGIN_EMAIL?.trim();
  const password = process.env.DEMO_LOGIN_PASSWORD;

  if (!email || !password) {
    return {
      error:
        "Demo login is not configured. Set DEMO_LOGIN_EMAIL and DEMO_LOGIN_PASSWORD on the server.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return {
      error:
        "Demo login failed. Confirm the demo user exists in Supabase Auth and the server-only credentials match.",
    };
  }

  redirect("/dashboard");
}
