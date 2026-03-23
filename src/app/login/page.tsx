import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LoginForm from "./login-form";

async function signInWithGoogle() {
  "use server";
  const supabase = await createClient();

  // Always use the configured app URL for OAuth redirects to prevent open redirect
  // attacks via x-forwarded-host header manipulation.
  const origin = process.env.NEXT_PUBLIC_APP_URL;

  if (!origin) {
    throw new Error("Missing app origin for OAuth redirect — set NEXT_PUBLIC_APP_URL");
  }

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

export default function LoginPage() {
  return <LoginForm signInWithGoogle={signInWithGoogle} />;
}
