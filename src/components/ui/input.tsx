import * as React from "react";

import { cn } from "@/lib/utils";

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          "flex h-10 w-full rounded-lg border-2 border-input bg-background px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground transition-all duration-200 hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary focus-visible:bg-background disabled:cursor-not-allowed disabled:opacity-50 shadow-sm focus-visible:shadow-md dark:bg-card dark:border-border dark:hover:border-primary/50",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
