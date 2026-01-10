import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LoginForm from "./login-form";

async function signInWithGoogle() {
  "use server";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  });
  
  if (data.url) {
    redirect(data.url);
  }
}

export default function LoginPage() {
  return <LoginForm signInWithGoogle={signInWithGoogle} />;
}
