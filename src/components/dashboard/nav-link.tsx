"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export function DashboardNavLink({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
}) {
  const pathname = usePathname();
  // Exact match for /dashboard (Home); prefix match for other nav items
  const active = href === "/dashboard"
    ? pathname === "/dashboard"
    : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-3 rounded-lg py-2 text-sm font-medium transition-all duration-150",
        active
          ? "border-l-2 border-primary bg-gradient-to-r from-primary/12 to-primary/4 pl-[calc(0.75rem-2px)] pr-3 text-primary"
          : "border-l-2 border-transparent pl-[calc(0.75rem-2px)] pr-3 text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
    >
      <Icon
        className={cn(
          "h-4 w-4 shrink-0 transition-colors",
          active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
        )}
      />
      <span className="truncate">{label}</span>
    </Link>
  );
}
