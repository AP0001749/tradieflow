import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] active:shadow-sm",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/35 dark:shadow-primary/40 dark:hover:shadow-primary/50",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm shadow-black/5 hover:shadow-md hover:shadow-black/10 dark:bg-secondary dark:hover:bg-secondary/80 dark:shadow-black/30 dark:hover:shadow-black/40",
        outline:
          "border-2 border-input bg-background hover:bg-accent hover:text-accent-foreground shadow-sm hover:shadow-md hover:border-primary/30 dark:border-border dark:hover:bg-accent dark:hover:border-primary/50",
        ghost: "hover:bg-accent hover:text-accent-foreground hover:shadow-sm hover:shadow-black/5 dark:hover:shadow-black/30",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-md shadow-destructive/25",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 md:h-9 rounded-md px-3 text-xs md:text-sm",
        lg: "h-11 md:h-12 rounded-md px-6 md:px-8",
        icon: "h-8 w-8 md:h-9 md:w-9 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Button, buttonVariants };
