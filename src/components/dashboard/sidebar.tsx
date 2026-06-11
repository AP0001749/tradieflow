"use client";

import Link from "next/link";
import {
  Home,
  Users,
  Briefcase,
  FileText,
  CreditCard,
  LogOut,
  Megaphone,
  UserPlus,
  Settings,
  Route as RouteIcon,
  Zap,
} from "lucide-react";

import { DashboardNavLink } from "@/components/dashboard/nav-link";

const mainNav = [
  { name: "Home",     href: "/dashboard",          icon: Home },
  { name: "Leads",    href: "/dashboard/leads",     icon: UserPlus },
  { name: "Dispatch", href: "/dashboard/dispatch",  icon: RouteIcon },
  { name: "Outreach", href: "/dashboard/outreach",  icon: Megaphone },
];

const manageNav = [
  { name: "Clients",  href: "/dashboard/clients",  icon: Users },
  { name: "Jobs",     href: "/dashboard/jobs",      icon: Briefcase },
  { name: "Invoices", href: "/dashboard/invoices",  icon: FileText },
];

const accountNav = [
  { name: "Billing",  href: "/dashboard/billing",  icon: CreditCard },
  { name: "Settings", href: "/dashboard/settings",  icon: Settings },
];

function getInitials(email?: string | null): string {
  if (!email) return "TF";
  const [local] = email.split("@");
  const parts = local.split(/[._-]/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return local.slice(0, 2).toUpperCase();
}

export function DashboardSidebar({ email }: { email?: string | null }) {
  const initials = getInitials(email);

  return (
    <aside
      className="hidden md:flex md:w-60 shrink-0 border-r border-border/80 bg-card flex-col"
      data-print-hidden="true"
    >
      {/* Logo */}
      <div className="p-5 border-b border-border/60">
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-emerald-500 shadow-sm transition-transform group-hover:scale-105">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <span className="text-base font-bold tracking-tight text-gradient-tf">
            TradieFlow
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
        {/* Main group */}
        <div>
          <p className="nav-group-label">Main</p>
          <div className="space-y-0.5">
            {mainNav.map((item) => (
              <DashboardNavLink
                key={item.href}
                href={item.href}
                label={item.name}
                icon={item.icon}
              />
            ))}
          </div>
        </div>

        {/* Manage group */}
        <div>
          <p className="nav-group-label">Manage</p>
          <div className="space-y-0.5">
            {manageNav.map((item) => (
              <DashboardNavLink
                key={item.href}
                href={item.href}
                label={item.name}
                icon={item.icon}
              />
            ))}
          </div>
        </div>

        {/* Account group */}
        <div>
          <p className="nav-group-label">Account</p>
          <div className="space-y-0.5">
            {accountNav.map((item) => (
              <DashboardNavLink
                key={item.href}
                href={item.href}
                label={item.name}
                icon={item.icon}
              />
            ))}
          </div>
        </div>
      </nav>

      {/* User + Sign Out */}
      <div className="p-3 border-t border-border/60 space-y-1">
        {/* User row */}
        <div className="flex items-center gap-3 rounded-lg px-3 py-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/10 ring-1 ring-primary/20">
            <span className="text-xs font-bold text-primary">{initials}</span>
          </div>
          <p className="text-xs text-muted-foreground truncate min-w-0 flex-1">
            {email ?? ""}
          </p>
        </div>

        {/* Sign out */}
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm font-medium text-muted-foreground hover:bg-destructive/8 hover:text-destructive transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Sign Out</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
