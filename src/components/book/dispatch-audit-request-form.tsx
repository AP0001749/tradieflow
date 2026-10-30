"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function DispatchAuditRequestForm() {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function onSubmit(formData: FormData) {
    setSubmitting(true);

    try {
      const response = await fetch("/api/prospects/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_name: String(formData.get("business_name") || ""),
          contact_name: String(formData.get("contact_name") || ""),
          mobile: String(formData.get("mobile") || ""),
          email: String(formData.get("email") || ""),
          service_area: String(formData.get("service_area") || ""),
          notes: String(formData.get("notes") || ""),
          website: String(formData.get("website") || ""),
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(payload?.error || "Failed to submit request");
      }

      setSubmitted(true);
      toast.success("Request received. We will reply within one business day.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="space-y-3 rounded-lg border border-border/60 bg-muted/30 p-4">
        <p className="font-medium">Thanks — your dispatch audit request is in.</p>
        <p className="text-sm text-muted-foreground">
          We will reply by email with next steps for missed-call recovery and urgent lead handling.
        </p>
      </div>
    );
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="business_name">Business name</Label>
          <Input id="business_name" name="business_name" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contact_name">Your name</Label>
          <Input id="contact_name" name="contact_name" required />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="mobile">Mobile</Label>
          <Input id="mobile" name="mobile" type="tel" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="service_area">Service area</Label>
        <Input id="service_area" name="service_area" placeholder="e.g. Western Sydney" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">What is leaking jobs today?</Label>
        <Textarea
          id="notes"
          name="notes"
          placeholder="Missed calls after hours, slow quote follow-up, no review asks..."
          rows={4}
        />
      </div>
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden="true"
      />
      <Button type="submit" className="primary-btn" disabled={submitting}>
        {submitting ? "Sending..." : "Request free dispatch audit"}
      </Button>
    </form>
  );
}
