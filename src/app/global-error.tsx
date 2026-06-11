"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen flex items-center justify-center bg-background px-4 font-sans">
        <div className="text-center space-y-6 max-w-md">
          <div className="flex justify-center">
            <div className="p-4 rounded-2xl bg-destructive/10">
              <AlertTriangle className="h-10 w-10 text-destructive" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Something went wrong
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              An unexpected error occurred. Your data is safe — try refreshing the page
              or return to the dashboard.
            </p>
            {error.digest && (
              <p className="text-xs text-muted-foreground font-mono">
                Error ID: {error.digest}
              </p>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={reset}
              className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </button>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center h-10 px-5 rounded-lg border border-input bg-background text-sm font-medium hover:bg-accent transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
