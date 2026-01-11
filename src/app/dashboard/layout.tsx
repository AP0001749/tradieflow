import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Home, Users, Briefcase, FileText, CreditCard, LogOut } from "lucide-react";
import { DashboardNavLink } from "@/components/dashboard/nav-link";

const navItems = [
  { name: "Home", href: "/dashboard", icon: Home },
  { name: "Clients", href: "/dashboard/clients", icon: Users },
  { name: "Jobs", href: "/dashboard/jobs", icon: Briefcase },
  { name: "Invoices", href: "/dashboard/invoices", icon: FileText },
  { name: "Billing", href: "/dashboard/billing", icon: CreditCard },
];

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
      {/* Sidebar */}
      <aside
        className="w-72 border-r border-border bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/40 flex flex-col"
        data-print-hidden="true"
      >
        <div className="p-6 border-b border-border">
          <Link href="/dashboard" className="block">
            <h1 className="text-2xl font-semibold tracking-tight">
              <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                TradieFlow
              </span>
            </h1>
          </Link>
          <p className="text-xs text-muted-foreground mt-2 truncate">{user.email}</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <DashboardNavLink
              key={item.href}
              href={item.href}
              label={item.name}
              icon={item.icon}
            />
          ))}
        </nav>

        <div className="p-4 border-t border-border">
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="font-medium">Sign Out</span>
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
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

        <div className="container py-8" data-layout-content>
          {children}
        </div>
      </main>
    </div>
  );
}
