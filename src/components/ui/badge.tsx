import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80 shadow-md shadow-primary/20 dark:shadow-primary/30",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-md shadow-black/5 dark:shadow-black/50",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80 shadow-md shadow-destructive/20 dark:shadow-destructive/30",
        outline: "text-foreground border-border/60",
        draft: "border-border bg-muted text-muted-foreground shadow-md shadow-black/5 dark:shadow-black/50",
        scheduled: "border-transparent bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 shadow-md shadow-blue-500/20 dark:shadow-blue-500/30 dark:text-blue-300",
        in_progress: "border-transparent bg-amber-500/15 text-amber-500 hover:bg-amber-500/25 shadow-md shadow-amber-500/20 dark:shadow-amber-500/30 dark:text-amber-300",
        completed: "border-transparent bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25 shadow-md shadow-emerald-500/20 dark:shadow-emerald-500/30 dark:text-emerald-300",
        cancelled: "border-transparent bg-rose-500/15 text-rose-500 hover:bg-rose-500/25 shadow-md shadow-rose-500/20 dark:shadow-rose-500/30 dark:text-rose-300",
        overdue: "border-transparent bg-orange-500/15 text-orange-500 hover:bg-orange-500/25 shadow-md shadow-orange-500/20 dark:shadow-orange-500/30 dark:text-orange-300",
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
