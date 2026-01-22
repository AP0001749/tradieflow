import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import LoginForm from "./login-form";

async function signInWithGoogle() {
  "use server";
  const supabase = await createClient();

  const headerStore = await headers();
  const proto = headerStore.get("x-forwarded-proto") ?? "http";
  const host =
    headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? null;
  const origin = host ? `${proto}://${host}` : process.env.NEXT_PUBLIC_APP_URL;

  if (!origin) {
    throw new Error("Missing app origin for OAuth redirect");
  }

  const { data } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback`,
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
