import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardSidebar } from "@/components/dashboard/sidebar";

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
      <main className="flex-1 min-w-0 overflow-auto">
        <div className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60" data-print-hidden="true">
          <div className="container py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Dashboard</p>
                <p className="text-xs text-muted-foreground">Welcome back</p>
              </div>
              <Link
                href="/legal/privacy"
                className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
              >
                Privacy
              </Link>
            </div>
          </div>
        </div>

        <div className="container py-8 min-w-0" data-layout-content>
          {children}
        </div>
      </main>
    </div>
  );
}
