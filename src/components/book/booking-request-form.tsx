"use client";

import { useState } from "react";
import { trackLeadConversion } from "@/utils/gtag";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface BookingRequestFormProps {
  bookingUrlSlug: string;
  businessName: string;
}

export function BookingRequestForm({
  bookingUrlSlug,
  businessName,
}: BookingRequestFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const businessNameValue = (formData.get("business_name") as string) || "";
    const yourName = (formData.get("your_name") as string) || "";
    const mobile = (formData.get("mobile") as string) || "";
    const email = (formData.get("email") as string) || "";
    const serviceArea = (formData.get("service_area") as string) || "";
    const serviceType = (formData.get("service_type") as string) || "";
    const abn = (formData.get("abn") as string) || "";
    const notes = (formData.get("notes") as string) || "";
    const website = (formData.get("website") as string) || "";

    const data = {
      booking_url_slug: bookingUrlSlug,
      website,
      business_name: businessNameValue,
      your_name: yourName,
      mobile,
      email,
      service_area: serviceArea,
      service_type: serviceType,
      abn,
      notes,
    };

    try {
      const response = await fetch("/api/leads/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = (await response.json()) as {
        error?: string;
        success?: boolean;
        lead_id?: string;
      };

      if (!response.ok) {
        throw new Error(json.error || "Failed to submit request");
      }

      setIsSuccess(true);

      if (json.lead_id) {
        const [firstName, ...rest] = yourName.trim().split(/\s+/).filter(Boolean);
        const lastName = rest.length ? rest.join(" ") : undefined;

        await trackLeadConversion({
          leadId: json.lead_id,
          userData: {
            email,
            phone_number: mobile,
            first_name: firstName || undefined,
            last_name: lastName,
          },
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="glass-card max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Demo Request Received</CardTitle>
            <CardDescription className="text-center">
              Thanks for contacting {businessName}. The team will reach out shortly with
              next steps for your Zero-Leak Funnel walkthrough.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground">
              Keep an eye on your phone and email for the follow-up.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Card className="glass-card w-full">
      <CardHeader className="space-y-2">
        <CardTitle className="text-2xl">Request a Zero-Leak Funnel demo</CardTitle>
        <CardDescription>
          Tell {businessName} where calls and quotes are slipping through the cracks, and
          they&apos;ll show you how TradieFlow can tighten the workflow.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <input type="hidden" name="booking_url_slug" value={bookingUrlSlug} />
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            className="hidden"
            aria-hidden="true"
          />

          <div className="form-grid">
            <div className="space-y-2">
              <Label htmlFor="business_name">Business name *</Label>
              <Input
                id="business_name"
                name="business_name"
                required
                placeholder="e.g. Western Climate Air"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="your_name">Your name *</Label>
              <Input
                id="your_name"
                name="your_name"
                required
                placeholder="e.g. John Smith"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mobile">Mobile *</Label>
              <Input id="mobile" name="mobile" required placeholder="04xx xxx xxx" />
            </div>
          </div>

          <div className="form-grid">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                placeholder="you@yourbusiness.com.au"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="service_area">Suburb / service area *</Label>
              <Input
                id="service_area"
                name="service_area"
                required
                placeholder="e.g. Tarneit, Point Cook, Werribee, Geelong"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="abn">ABN (optional)</Label>
              <Input id="abn" name="abn" placeholder="11 digits" />
              <p className="text-xs text-muted-foreground">
                Include your ABN so your workspace and invoice settings can be prefilled.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="service_type">Primary trade *</Label>
              <Select id="service_type" name="service_type" required>
                <option value="">Select trade</option>
                <option value="hvac_service">HVAC service & breakdowns</option>
                <option value="hvac_install">Heating / cooling installs</option>
                <option value="emergency_plumbing">Emergency plumbing</option>
                <option value="electrical">Electrical & switchboards</option>
                <option value="mixed_trade">Mixed trade services</option>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Biggest call leak or follow-up issue? (optional)</Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Missed after-hours calls, quote delays, dispatch bottlenecks, or review follow-up gaps"
              rows={4}
            />
          </div>

          {error && (
            <div className="p-3 rounded-md border border-destructive/30 bg-destructive/10">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <Button type="submit" className="primary-btn w-full" disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Request Zero-Leak Demo"}
          </Button>

          <p className="form-note text-center">
            We&apos;ll map the new workflow around missed calls, quote follow-up, and paid
            review requests.
            <br />
            By submitting, you agree to be contacted about your TradieFlow account.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
