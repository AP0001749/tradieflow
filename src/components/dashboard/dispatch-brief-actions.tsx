"use client";

import { useState } from "react";
import { Check, Copy, Mail, Phone } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DispatchBriefActionsProps {
  briefText: string;
  phone?: string | null;
  email?: string | null;
  compact?: boolean;
}

export function DispatchBriefActions({
  briefText,
  phone,
  email,
  compact,
}: DispatchBriefActionsProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(briefText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        size={compact ? "sm" : "default"}
        variant="outline"
        onClick={handleCopy}
      >
        {copied ? (
          <>
            <Check className="mr-1.5 h-4 w-4" />
            Copied
          </>
        ) : (
          <>
            <Copy className="mr-1.5 h-4 w-4" />
            Copy Brief
          </>
        )}
      </Button>

      {phone ? (
        <a
          href={`tel:${phone}`}
          className={cn(buttonVariants({ variant: "outline", size: compact ? "sm" : "default" }))}
        >
          <Phone className="mr-1.5 h-4 w-4" />
          Call
        </a>
      ) : null}

      {email ? (
        <a
          href={`mailto:${email}`}
          className={cn(buttonVariants({ variant: "ghost", size: compact ? "sm" : "default" }))}
        >
          <Mail className="mr-1.5 h-4 w-4" />
          Email
        </a>
      ) : null}
    </div>
  );
}
