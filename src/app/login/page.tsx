import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getAppOrigin } from "@/lib/app-origin";
import { createClient } from "@/lib/supabase/server";
import LoginForm from "./login-form";

async function signInWithGoogle() {
  "use server";
  const supabase = await createClient();

  // Always use the configured app URL for OAuth redirects to prevent open redirect
  // attacks via x-forwarded-host header manipulation.
  const origin = getAppOrigin();

  const { data } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback`,
      queryParams: {
        prompt: "select_account", // Always show account picker
      },
    },
  });

  if (data.url) {
    redirect(data.url);
  }

  throw new Error("Unable to start Google OAuth flow");
}

export const metadata: Metadata = {
  title: "Sign In — TradieFlow",
  description: "Sign in to your TradieFlow account.",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return <LoginForm signInWithGoogle={signInWithGoogle} />;
}
