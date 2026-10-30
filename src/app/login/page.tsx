import type { Metadata } from "next";

import { isDemoLoginConfigured } from "@/lib/demo-login";

import LoginForm from "./login-form";
import {
  signInWithDemo,
  signInWithGoogle,
} from "./actions";

export const metadata: Metadata = {
  title: "Sign In — TradieFlow",
  description: "Sign in to your TradieFlow account.",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const initialError =
    error === "auth"
      ? "Sign-in did not complete. Try again or use email."
      : error === "config"
        ? "App URL or Supabase keys are missing. Check NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_SUPABASE_URL, and NEXT_PUBLIC_SUPABASE_ANON_KEY."
        : null;

  return (
    <LoginForm
      demoEnabled={isDemoLoginConfigured()}
      initialError={initialError}
      signInWithDemo={signInWithDemo}
      signInWithGoogle={signInWithGoogle}
    />
  );
}
