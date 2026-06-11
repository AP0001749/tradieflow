import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { MobileNav } from "@/components/dashboard/mobile-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { Zap } from "lucide-react";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const now = new Date();
  const dateLabel = now.toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar email={user.email} />

      {/* Main Content */}
      <main className="flex-1 min-w-0 overflow-auto w-full">
        <div className="relative">
          {/* Header */}
          <div
            className="sticky top-0 z-10 dashboard-header-bar"
            data-print-hidden="true"
          >
            {/* Gradient top accent line */}
            <div className="h-[2px] w-full bg-gradient-to-r from-sky-500 via-primary to-emerald-500" />

            <div className="flex items-center justify-between gap-4 px-4 md:px-6 h-14">
              {/* Mobile brand mark (hidden on desktop where sidebar shows) */}
              <div className="flex items-center gap-2 md:hidden">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-emerald-500">
                  <Zap className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-sm font-bold text-gradient-tf">TradieFlow</span>
              </div>

              {/* Date label (desktop only) */}
              <p className="hidden md:block text-xs text-muted-foreground font-medium tabular-nums">
                {dateLabel}
              </p>

              <div className="flex items-center gap-2 shrink-0 ml-auto">
                <ThemeToggle />
                <Link
                  href="/legal/privacy"
                  className="hidden sm:block text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Privacy
                </Link>
              </div>
            </div>
          </div>

          {/* Page content */}
          <div className="px-4 md:px-6 py-6 md:py-8 min-w-0 pb-24 md:pb-8" data-layout-content>
            {children}
          </div>
        </div>
      </main>

      {/* Mobile bottom tab bar */}
      <MobileNav email={user.email} />
    </div>
  );
}
