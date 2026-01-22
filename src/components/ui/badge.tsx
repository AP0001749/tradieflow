import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80 shadow-sm",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80 shadow-sm",
        outline: "text-foreground border-border/60",
        draft: "border-border bg-muted text-muted-foreground shadow-sm",
        scheduled: "border-transparent bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 shadow-sm shadow-blue-500/10 dark:text-blue-300",
        in_progress: "border-transparent bg-amber-500/15 text-amber-500 hover:bg-amber-500/25 shadow-sm shadow-amber-500/10 dark:text-amber-300",
        completed: "border-transparent bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25 shadow-sm shadow-emerald-500/10 dark:text-emerald-300",
        cancelled: "border-transparent bg-rose-500/15 text-rose-500 hover:bg-rose-500/25 shadow-sm shadow-rose-500/10 dark:text-rose-300",
        overdue: "border-transparent bg-orange-500/15 text-orange-500 hover:bg-orange-500/25 shadow-sm shadow-orange-500/10 dark:text-orange-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
