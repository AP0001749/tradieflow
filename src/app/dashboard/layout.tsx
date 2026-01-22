import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";

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

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar email={user.email} />

      {/* Main Content */}
      <main className="relative flex-1 min-w-0 overflow-auto">
        {/* Gradient Background */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent dark:from-indigo-500/20"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,_var(--tw-gradient-stops))] from-violet-500/5 via-transparent to-transparent dark:from-violet-500/10"
        />

        <div className="relative">
          <div
            className="sticky top-0 z-10 border-b border-border/40 bg-background/60 backdrop-blur-xl supports-[backdrop-filter]:bg-background/40 shadow-sm"
            data-print-hidden="true"
          >
            <div className="container py-5 px-6">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold tracking-wide bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">Dashboard</p>
                  <p className="text-xs text-muted-foreground truncate">
                    Welcome back
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <ThemeToggle />
                  <Link
                    href="/legal/privacy"
                    className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors duration-200"
                  >
                    Privacy Policy
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="container py-10 px-6 min-w-0" data-layout-content>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
