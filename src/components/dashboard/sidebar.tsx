"use client";

import Link from "next/link";
import { Home, Users, Briefcase, FileText, CreditCard, LogOut, UserPlus, Settings } from "lucide-react";

import { DashboardNavLink } from "@/components/dashboard/nav-link";

const navItems = [
  { name: "Home", href: "/dashboard", icon: Home },
  { name: "Leads", href: "/dashboard/leads", icon: UserPlus },
  { name: "Clients", href: "/dashboard/clients", icon: Users },
  { name: "Jobs", href: "/dashboard/jobs", icon: Briefcase },
  { name: "Invoices", href: "/dashboard/invoices", icon: FileText },
  { name: "Billing", href: "/dashboard/billing", icon: CreditCard },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function DashboardSidebar({ email }: { email?: string | null }) {
  return (
    <aside
      className="hidden md:flex md:w-64 shrink-0 border-r border-border bg-card flex-col"
      data-print-hidden="true"
    >
      <div className="p-6 border-b border-border">
        <Link href="/dashboard" className="block">
          <h1 className="text-xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-sky-500 to-emerald-500 bg-clip-text text-transparent">
              TradieFlow
            </span>
          </h1>
        </Link>
        <p className="text-xs text-muted-foreground mt-1.5 truncate">
          {email ?? ""}
        </p>
      </div>

      <nav className="flex-1 p-3 space-y-0.5">
        {navItems.map((item) => (
          <DashboardNavLink
            key={item.href}
            href={item.href}
            label={item.name}
            icon={item.icon}
          />
        ))}
      </nav>

      <div className="p-3 border-t border-border">
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
