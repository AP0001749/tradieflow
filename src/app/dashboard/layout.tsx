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
      <main className="flex-1 min-w-0 overflow-auto w-full">
        <div className="relative">
          <div
            className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-md"
            data-print-hidden="true"
          >
            <div className="flex items-center justify-between gap-4 px-4 md:px-6 h-14">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">Dashboard</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
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

          <div className="px-4 md:px-6 py-6 md:py-8 min-w-0" data-layout-content>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
