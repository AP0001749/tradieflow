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
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
        active
          ? "bg-accent text-accent-foreground shadow-sm"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:shadow-sm"
      )}
    >
      <Icon
        className={cn(
          "h-4 w-4 transition-colors",
          active
            ? "text-accent-foreground"
            : "text-muted-foreground group-hover:text-accent-foreground"
        )}
      />
      <span className="truncate">{label}</span>
    </Link>
  );
}
