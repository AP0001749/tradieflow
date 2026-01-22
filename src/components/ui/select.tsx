"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "flex h-10 w-full appearance-none cursor-pointer rounded-lg border border-input bg-background/50 backdrop-blur-sm px-3.5 py-2 text-sm text-foreground shadow-sm hover:shadow-md focus-visible:shadow-lg focus-visible:shadow-primary/5 ring-offset-background transition-all duration-200 hover:border-input/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-primary/50 focus-visible:bg-background/80 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
);
Select.displayName = "Select";

export type SelectItemProps = React.OptionHTMLAttributes<HTMLOptionElement>;

export function SelectItem({ className, ...props }: SelectItemProps) {
  return (
    <option
      className={cn("bg-background text-foreground", className)}
      {...props}
    />
  );
}
