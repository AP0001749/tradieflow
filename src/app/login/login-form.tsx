"use client";

import type * as React from "react";
import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Lock, Mail, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";

interface LoginFormProps {
  signInWithGoogle: () => Promise<void>;
}

export default function LoginForm({ signInWithGoogle }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const router = useRouter();

  function validateCredentials() {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return "Email address is required.";
    if (!password) return "Password is required.";
    return null;
  }

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateCredentials();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);
    setNotice(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  };

  const handleSignUp = async () => {
    const validationError = validateCredentials();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);
    setNotice(null);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (data.session) {
      // New signup with immediate session - redirect to welcome page for conversion tracking
      router.push("/welcome");
      router.refresh();
      return;
    }

    setNotice(
      "Account created. Check your email to confirm and complete sign-up."
    );
    setLoading(false);
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background px-4 py-12 overflow-hidden">
      {/* Theme Toggle */}
      <div className="absolute top-4 right-4 z-20 animate-in fade-in slide-in-from-top-2 duration-500">
        <ThemeToggle />
      </div>

      {/* Premium Gradient Backdrop */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,_var(--tw-gradient-stops))] from-indigo-300/40 via-background to-background dark:from-indigo-900/40 dark:via-background animate-in fade-in duration-1000" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,_var(--tw-gradient-stops))] from-violet-300/30 via-transparent to-transparent dark:from-violet-900/30 animate-in fade-in duration-1000" style={{ animationDelay: '200ms' }} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,_var(--tw-gradient-stops))] from-indigo-300/30 via-transparent to-transparent dark:from-indigo-900/30 animate-in fade-in duration-1000" style={{ animationDelay: '400ms' }} />
      
      {/* Animated gradient orbs */}
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-indigo-500/20 dark:bg-indigo-500/30 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
      <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-violet-500/20 dark:bg-violet-500/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s', animationDuration: '4s' }} />

      <Card className="w-full max-w-md border-border/40 bg-card/60 backdrop-blur-2xl text-card-foreground shadow-2xl shadow-black/10 dark:shadow-black/30 relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <CardHeader className="space-y-2 text-center pb-6 pt-8">
          <div className="flex justify-center mb-4 animate-in zoom-in duration-500" style={{ animationDelay: '100ms' }}>
            <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/30 shadow-xl shadow-indigo-500/20 backdrop-blur-sm">
              <Briefcase className="h-8 w-8 text-indigo-500 dark:text-indigo-400" />
            </div>
          </div>
          <CardTitle className="text-2xl md:text-3xl font-bold tracking-tight">
            <span className="bg-gradient-to-br from-indigo-500 to-violet-600 bg-clip-text text-transparent">
              Start Your Free Trial
            </span>
          </CardTitle>
          <CardDescription className="text-muted-foreground text-sm md:text-base pt-1">
            Start billing cleaning jobs and capturing leads in under 60 seconds
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5 px-4 md:px-6">
          {notice && (
            <div className="p-3.5 text-sm text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-lg animate-in fade-in slide-in-from-top-2 duration-300 break-words">
              {notice}
            </div>
          )}
          {error && (
            <div className="p-3.5 text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg animate-in fade-in slide-in-from-top-2 duration-300 break-words">
              {error}
            </div>
          )}

          {/* Primary CTA: Google Sign Up */}
          <form action={signInWithGoogle} onSubmit={() => setGoogleLoading(true)}>
            <Button
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/40 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={googleLoading}
            >
              {googleLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Redirecting...
                </>
              ) : (
                <>
                  <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Sign Up Free with Google
                </>
              )}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground">
            One click. No credit card. Start capturing cleaning leads and invoicing immediately.
          </p>

          <div className="relative py-3">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/60" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card/60 backdrop-blur-sm px-3 text-muted-foreground font-medium tracking-wider">Or use email</span>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  className="pl-10 h-11 bg-background/40 border-border placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-indigo-500/30 focus-visible:border-indigo-500/40 transition-all"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-10 h-11 bg-background/40 border-border placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-indigo-500/30 focus-visible:border-indigo-500/40 transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="outline"
              className="w-full h-11 border-border/60 bg-background/40 hover:bg-accent hover:text-accent-foreground font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Please wait...
                </>
              ) : (
                "Sign In with Email"
              )}
            </Button>
          </form>

          <Button
            type="button"
            variant="ghost"
            className="w-full h-10 text-muted-foreground hover:text-foreground transition-all duration-200 disabled:opacity-50 text-sm"
            onClick={handleSignUp}
            disabled={loading}
          >
            New here? <span className="ml-1.5 font-semibold underline">Create account with email</span>
          </Button>
        </CardContent>

        <CardFooter className="flex-col space-y-2 px-4 md:px-6 pb-8 pt-2">
          <p className="text-center text-xs leading-relaxed text-zinc-500 px-2">
            By signing up, you agree to our{" "}
            <Link
              href="/legal/terms"
              className="underline underline-offset-4 hover:text-zinc-300"
            >
              Terms
            </Link>
            {" "}and{" "}
            <Link
              href="/legal/privacy"
              className="underline underline-offset-4 hover:text-zinc-300"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
