"use client";

import Link from "next/link";
import { Home, Users, Briefcase, FileText, CreditCard, LogOut } from "lucide-react";

import { DashboardNavLink } from "@/components/dashboard/nav-link";

const navItems = [
  { name: "Home", href: "/dashboard", icon: Home },
  { name: "Clients", href: "/dashboard/clients", icon: Users },
  { name: "Jobs", href: "/dashboard/jobs", icon: Briefcase },
  { name: "Invoices", href: "/dashboard/invoices", icon: FileText },
  { name: "Billing", href: "/dashboard/billing", icon: CreditCard },
];

export function DashboardSidebar({ email }: { email?: string | null }) {
  return (
    <aside
      className="w-72 shrink-0 border-r border-border/60 bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/40 dark:bg-card/50 dark:supports-[backdrop-filter]:bg-card/40 flex flex-col"
      data-print-hidden="true"
    >
      <div className="p-6 border-b border-border/60">
        <Link href="/dashboard" className="block">
          <h1 className="text-2xl font-semibold tracking-tight">
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              TradieFlow
            </span>
          </h1>
        </Link>
        <p className="text-xs text-muted-foreground mt-2 truncate">
          {email ?? ""}
        </p>
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

      <div className="p-4 border-t border-border/60">
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
  );
}
