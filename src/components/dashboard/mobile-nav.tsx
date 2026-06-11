"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Users,
  Briefcase,
  FileText,
  Megaphone,
  UserPlus,
  Route as RouteIcon,
  MoreHorizontal,
  CreditCard,
  Settings,
  LogOut,
  X,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const primaryNav = [
  { name: "Home", href: "/dashboard", icon: Home },
  { name: "Leads", href: "/dashboard/leads", icon: UserPlus },
  { name: "Dispatch", href: "/dashboard/dispatch", icon: RouteIcon },
  { name: "Jobs", href: "/dashboard/jobs", icon: Briefcase },
  { name: "More", href: null, icon: MoreHorizontal },
];

const allNav = [
  { name: "Outreach", href: "/dashboard/outreach", icon: Megaphone },
  { name: "Clients", href: "/dashboard/clients", icon: Users },
  { name: "Invoices", href: "/dashboard/invoices", icon: FileText },
  { name: "Billing", href: "/dashboard/billing", icon: CreditCard },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

function NavItem({
  href,
  label,
  icon: Icon,
  active,
  onClick,
}: {
  href: string;
  label: string;
  icon: typeof Home;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center gap-1 px-2 py-1.5 transition-colors min-w-0 flex-1",
        active ? "text-primary" : "text-muted-foreground",
      )}
    >
      {active && (
        <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-primary" />
      )}
      <Icon className="h-5 w-5 shrink-0 mt-1" />
      <span className="text-[10px] font-medium leading-none truncate max-w-full">{label}</span>
    </Link>
  );
}

export function MobileNav({ email }: { email?: string | null }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  function isActive(href: string) {
    return href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname === href || pathname.startsWith(`${href}/`);
  }

  const anySecondaryActive = allNav.some((item) => isActive(item.href));

  return (
    <>
      {/* Bottom tab bar */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur-md safe-area-pb"
        data-print-hidden="true"
      >
        <div className="flex items-stretch h-16 px-1">
          {primaryNav.map((item) => {
            if (item.href === null) {
              // "More" button opens the drawer
              return (
                <button
                  key="more"
                  type="button"
                  onClick={() => setDrawerOpen(true)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 px-2 py-1.5 rounded-lg transition-colors flex-1",
                    anySecondaryActive ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <MoreHorizontal className="h-5 w-5 shrink-0" />
                  <span className="text-[10px] font-medium leading-none">More</span>
                </button>
              );
            }
            return (
              <NavItem
                key={item.href}
                href={item.href}
                label={item.name}
                icon={item.icon}
                active={isActive(item.href)}
              />
            );
          })}
        </div>
      </nav>

      {/* Drawer overlay */}
      {drawerOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 flex flex-col justify-end"
          data-print-hidden="true"
        >
          {/* Scrim */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />

          {/* Sheet */}
          <div className="relative z-10 bg-background rounded-t-2xl border-t border-border pb-safe">
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-emerald-500 shadow-sm">
                  <Zap className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="font-bold text-sm text-gradient-tf">TradieFlow</p>
                  {email && (
                    <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                      {email}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="p-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="p-3 grid grid-cols-1 gap-0.5">
              {allNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setDrawerOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors",
                    isActive(item.href)
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {item.name}
                </Link>
              ))}
            </nav>

            <div className="px-3 pb-4 border-t border-border pt-3">
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                >
                  <LogOut className="h-5 w-5 shrink-0" />
                  Sign Out
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
