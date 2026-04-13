"use client";

import { useState, useTransition } from "react";
import { Mail, MessageSquare, Phone } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { recordLeadResponse } from "@/app/dashboard/leads/actions";
import { cn } from "@/lib/utils";

type LeadResponseActionLead = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  job_type?: string | null;
};

type LeadResponseChannel = "call" | "sms" | "email";

interface LeadResponseActionsProps {
  lead: LeadResponseActionLead;
  align?: "start" | "end";
  size?: "sm" | "default";
  showLabels?: boolean;
}

function buildSmsHref(lead: LeadResponseActionLead) {
  if (!lead.phone) {
    return null;
  }

  const firstName = lead.name.trim().split(/\s+/)[0] || "there";
  const body = `Hi ${firstName}, this is the dispatch team. Can you confirm what has happened and whether anyone is still on site?`;

  return `sms:${lead.phone}?body=${encodeURIComponent(body)}`;
}

function buildMailHref(lead: LeadResponseActionLead) {
  if (!lead.email) {
    return null;
  }

  return `mailto:${lead.email}?subject=${encodeURIComponent(
    `Re: ${lead.job_type || "your service request"}`,
  )}`;
}

export function LeadResponseActions({
  lead,
  align = "start",
  size = "sm",
  showLabels = true,
}: LeadResponseActionsProps) {
  const [pendingChannel, setPendingChannel] = useState<LeadResponseChannel | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const smsHref = buildSmsHref(lead);
  const mailHref = buildMailHref(lead);

  function launch(channel: LeadResponseChannel, href: string) {
    setError(null);
    setPendingChannel(channel);

    startTransition(async () => {
      try {
        await recordLeadResponse(lead.id, channel);
      } catch (responseError) {
        setError(
          responseError instanceof Error
            ? responseError.message
            : "Could not record response",
        );
      } finally {
        window.location.href = href;
        setPendingChannel(null);
      }
    });
  }

  const disabled = isPending;

  return (
    <div
      className={cn(
        "flex flex-wrap gap-2",
        align === "end" ? "justify-end" : "justify-start",
      )}
    >
      {lead.phone ? (
        <Button
          type="button"
          variant="outline"
          size={size}
          disabled={disabled}
          onClick={() => launch("call", `tel:${lead.phone}`)}
        >
          <Phone className="h-4 w-4" />
          {showLabels ? (pendingChannel === "call" ? "Opening..." : "Call") : null}
        </Button>
      ) : null}

      {smsHref ? (
        <Button
          type="button"
          variant="ghost"
          size={size}
          disabled={disabled}
          onClick={() => launch("sms", smsHref)}
        >
          <MessageSquare className="h-4 w-4" />
          {showLabels ? (pendingChannel === "sms" ? "Opening..." : "SMS") : null}
        </Button>
      ) : null}

      {mailHref ? (
        <Button
          type="button"
          variant="ghost"
          size={size}
          disabled={disabled}
          onClick={() => launch("email", mailHref)}
        >
          <Mail className="h-4 w-4" />
          {showLabels ? (pendingChannel === "email" ? "Opening..." : "Email") : null}
        </Button>
      ) : null}

      {!lead.phone && !lead.email ? (
        <span className={buttonVariants({ variant: "ghost", size })}>
          No response channel
        </span>
      ) : null}

      {error ? <p className="basis-full text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
