import Link from "next/link";
import { Briefcase, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="flex justify-center">
          <div className="p-4 rounded-2xl bg-muted">
            <Briefcase className="h-10 w-10 text-muted-foreground" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-5xl font-bold tracking-tight text-foreground">404</h1>
          <h2 className="text-xl font-semibold text-foreground">Page not found</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            This page doesn't exist or has been moved. Head back to the dashboard to
            keep your jobs and leads running.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center h-10 px-5 rounded-lg border border-input bg-background text-sm font-medium hover:bg-accent transition-colors"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
