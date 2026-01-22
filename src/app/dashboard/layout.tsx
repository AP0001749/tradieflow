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
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-500/5 via-transparent to-transparent dark:from-indigo-500/10"
        />

        <div className="relative">
          <div
            className="sticky top-0 z-10 border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60"
            data-print-hidden="true"
          >
            <div className="container py-4">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium">Dashboard</p>
                  <p className="text-xs text-muted-foreground truncate">
                    Welcome back
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <ThemeToggle />
                  <Link
                    href="/legal/privacy"
                    className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
                  >
                    Privacy
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="container py-8 min-w-0" data-layout-content>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
