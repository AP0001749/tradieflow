import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm shadow-primary/30 dark:shadow-primary/50",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm",
        destructive:
          "border-transparent bg-red-500/90 text-white hover:bg-red-500 shadow-sm shadow-red-500/30 dark:shadow-red-500/50",
        outline: "text-foreground border-border",
        draft: "border-border bg-muted text-muted-foreground shadow-sm",
        scheduled: "border-transparent bg-blue-500/90 text-white hover:bg-blue-500 shadow-sm shadow-blue-500/30 dark:shadow-blue-500/50",
        in_progress: "border-transparent bg-amber-500/90 text-white hover:bg-amber-500 shadow-sm shadow-amber-500/30 dark:shadow-amber-500/50",
        completed: "border-transparent bg-emerald-500/90 text-white hover:bg-emerald-500 shadow-sm shadow-emerald-500/30 dark:shadow-emerald-500/50",
        cancelled: "border-transparent bg-rose-500/90 text-white hover:bg-rose-500 shadow-sm shadow-rose-500/30 dark:shadow-rose-500/50",
        overdue: "border-transparent bg-orange-500/90 text-white hover:bg-orange-500 shadow-sm shadow-orange-500/30 dark:shadow-orange-500/50",
        sent: "border-transparent bg-indigo-500/90 text-white hover:bg-indigo-500 shadow-sm shadow-indigo-500/30 dark:shadow-indigo-500/50",
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
