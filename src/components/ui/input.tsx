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
          "flex h-10 w-full rounded-lg border border-input bg-background/50 backdrop-blur-sm px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 transition-all duration-200 hover:border-input/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:border-primary/50 focus-visible:bg-background/80 disabled:cursor-not-allowed disabled:opacity-50 shadow-sm hover:shadow-md focus-visible:shadow-lg focus-visible:shadow-primary/5",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
