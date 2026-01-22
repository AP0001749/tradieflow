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
      className="w-72 shrink-0 border-r border-border/40 bg-card/40 backdrop-blur-xl supports-[backdrop-filter]:bg-card/30 flex flex-col shadow-2xl shadow-black/5 dark:shadow-black/20 relative"
      data-print-hidden="true"
    >
      {/* Subtle gradient overlay */}
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none" />
      
      <div className="relative p-8 border-b border-border/40 backdrop-blur-sm">
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

      <nav className="relative flex-1 p-5 space-y-1.5">
        {navItems.map((item) => (
          <DashboardNavLink
            key={item.href}
            href={item.href}
            label={item.name}
            icon={item.icon}
          />
        ))}
      </nav>

      <div className="relative p-5 border-t border-border/40 backdrop-blur-sm">
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
