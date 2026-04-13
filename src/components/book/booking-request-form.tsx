"use client";

import { useState } from "react";
import { trackLeadConversion } from "@/utils/gtag";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import {
  AFTER_HOURS_COVERAGE_OPTIONS,
  DISPATCH_RADIUS_OPTIONS,
  DISPATCH_TEAM_SIZE_OPTIONS,
} from "@/lib/dispatch-profile";
import { LEAD_URGENCY_OPTIONS } from "@/lib/lead-triage";
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
  serviceTypeOptions: string[];
}

export function BookingRequestForm({
  bookingUrlSlug,
  businessName,
  serviceTypeOptions,
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
    const leadUrgency = (formData.get("lead_urgency") as string) || "";
    const triageProblem = (formData.get("triage_problem") as string) || "";
    const triageSiteRisk = (formData.get("triage_site_risk") as string) || "";
    const triageSafetyRisk = formData.get("triage_safety_risk") === "on";
    const teamSize = (formData.get("team_size") as string) || "";
    const afterHoursCoverage = (formData.get("after_hours_coverage") as string) || "";
    const dispatchRadius = (formData.get("dispatch_radius") as string) || "";
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
      lead_urgency: leadUrgency,
      triage_problem: triageProblem,
      triage_site_risk: triageSiteRisk,
      triage_safety_risk: triageSafetyRisk,
      team_size: teamSize,
      after_hours_coverage: afterHoursCoverage,
      dispatch_radius: dispatchRadius,
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
            <CardTitle className="text-2xl text-center">Dispatch Audit Requested</CardTitle>
            <CardDescription className="text-center">
              Thanks for contacting {businessName}. The team will reach out shortly with
              next steps for your Zero-Leak dispatch audit and onboarding walkthrough.
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
        <CardTitle className="text-2xl">Request a dispatch audit</CardTitle>
        <CardDescription>
          Tell {businessName} where emergency calls, quote follow-up, or dispatch
          handoff is leaking revenue, and they&apos;ll map how TradieFlow tightens the
          workflow for your trade business.
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
              <Label htmlFor="service_type">Job type *</Label>
              <Input
                id="service_type"
                name="service_type"
                list="dispatch-job-types"
                required
                placeholder={
                  serviceTypeOptions.length > 0
                    ? `e.g. ${serviceTypeOptions.slice(0, 2).join(" or ")}`
                    : "e.g. Emergency Callout"
                }
              />
              <datalist id="dispatch-job-types">
                {serviceTypeOptions.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
              <p className="text-xs text-muted-foreground">
                Start typing to use the saved service presets for this workspace, or enter a custom request.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="lead_urgency">Response urgency *</Label>
              <Select id="lead_urgency" name="lead_urgency" required defaultValue="scheduled">
                {LEAD_URGENCY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
              <p className="text-xs text-muted-foreground">
                Emergency and same-day requests move to the top of the response queue.
              </p>
            </div>
          </div>

          <div className="form-grid">
            <div className="space-y-2">
              <Label htmlFor="team_size">Team size</Label>
              <Select id="team_size" name="team_size">
                <option value="">Select team size</option>
                {DISPATCH_TEAM_SIZE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="after_hours_coverage">After-hours coverage</Label>
              <Select id="after_hours_coverage" name="after_hours_coverage">
                <option value="">Select coverage</option>
                {AFTER_HOURS_COVERAGE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dispatch_radius">Dispatch radius</Label>
              <Select id="dispatch_radius" name="dispatch_radius">
                <option value="">Select radius</option>
                {DISPATCH_RADIUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="form-grid">
            <div className="space-y-2">
              <Label htmlFor="triage_problem">What broke or leaked first?</Label>
              <Textarea
                id="triage_problem"
                name="triage_problem"
                placeholder="e.g. missed AC install calls after 5pm, emergency leak calls going unanswered, quotes stalling after inspection"
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="triage_site_risk">Access / risk context</Label>
              <Textarea
                id="triage_site_risk"
                name="triage_site_risk"
                placeholder="e.g. after-hours coverage gap, vulnerable customer, no receptionist, multiple vans in different suburbs"
                rows={4}
              />
              <label className="flex items-start gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  name="triage_safety_risk"
                  className="mt-1"
                />
                Safety-sensitive or property-damage risk is involved
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Biggest call leak or follow-up issue? (optional)</Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Missed emergency callouts, install quotes going cold, dispatch bottlenecks, or after-hours reply gaps"
              rows={4}
            />
          </div>

          {error && (
            <div className="p-3 rounded-md border border-destructive/30 bg-destructive/10">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <Button type="submit" className="primary-btn w-full" disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Request Dispatch Audit"}
          </Button>

          <p className="form-note text-center">
            We&apos;ll map the rollout around missed calls, quote follow-up, dispatch
            coverage, and paid review requests.
            <br />
            By submitting, you agree to be contacted about your TradieFlow account.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
