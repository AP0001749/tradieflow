import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Link2,
  Megaphone,
  ShieldCheck,
  Target,
} from "lucide-react";

import { OutreachCopyActions } from "@/components/dashboard/outreach-copy-actions";
import { CapitalExtractionSimulator } from "@/components/marketing/capital-extraction-simulator";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import {
  buildBookingUrl,
  buildOutreachCadence,
  buildOutreachScripts,
} from "@/lib/outreach-kit";
import {
  getEffectiveSubscriptionPlanKey,
  getSubscriptionPlanLabel,
  hasApexAutomationAccess,
  hasBaselineAutomationAccess,
} from "@/lib/pricing";
import { createClient } from "@/lib/supabase/server";
import { getTradeFocusMarketingLabel } from "@/lib/trade-focus";
import { cn } from "@/lib/utils";

type BusinessProfile = {
  booking_url_slug: string | null;
  business_name: string | null;
  default_job_types: string[] | null;
  missed_call_text_enabled: boolean | null;
  primary_trade_focus: string | null;
  quote_followup_enabled: boolean | null;
  review_request_enabled: boolean | null;
  service_area_postcodes: string[] | null;
};

function ReadinessItem({
  complete,
  label,
}: {
  complete: boolean;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <CheckCircle2
        className={cn(
          "h-4 w-4",
          complete ? "text-emerald-500" : "text-muted-foreground",
        )}
      />
      <span className={complete ? "text-foreground" : "text-muted-foreground"}>
        {label}
      </span>
    </div>
  );
}

export default async function OutreachPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("business_profile")
    .select(
      "business_name, booking_url_slug, primary_trade_focus, service_area_postcodes, default_job_types, missed_call_text_enabled, quote_followup_enabled, review_request_enabled",
    )
    .eq("user_id", user.id)
    .maybeSingle();
  const { data: subscriptionProfile } = await supabase
    .from("profiles")
    .select("subscription_tier, subscription_plan_key, subscription_status")
    .eq("user_id", user.id)
    .maybeSingle();

  const businessProfile = profile as BusinessProfile | null;
  const subscriptionPlanKey = getEffectiveSubscriptionPlanKey({
    subscriptionPlanKey: subscriptionProfile?.subscription_plan_key,
    subscriptionTier: subscriptionProfile?.subscription_tier,
    subscriptionStatus: subscriptionProfile?.subscription_status,
  });
  const canUseApexAutomations = hasApexAutomationAccess(subscriptionPlanKey);
  const canUseBaselineAutomations = hasBaselineAutomationAccess(subscriptionPlanKey);
  const businessName = businessProfile?.business_name || "TradieFlow";
  const bookingUrl = buildBookingUrl({
    appUrl: process.env.NEXT_PUBLIC_APP_URL,
    slug: businessProfile?.booking_url_slug,
  });
  const scripts = buildOutreachScripts({
    bookingUrl,
    businessName,
    senderName: user.user_metadata?.full_name || user.email,
    tradeFocus: businessProfile?.primary_trade_focus,
  });
  const cadence = buildOutreachCadence("standard");
  const serviceAreaCount = businessProfile?.service_area_postcodes?.length ?? 0;
  const jobTypeCount = businessProfile?.default_job_types?.length ?? 0;
  const automationCount = [
    canUseBaselineAutomations && businessProfile?.missed_call_text_enabled,
    canUseApexAutomations && businessProfile?.quote_followup_enabled,
    canUseApexAutomations && businessProfile?.review_request_enabled,
  ].filter(Boolean).length;

  return (
    <div className="space-y-8">
      <div className="animate-in fade-in slide-in-from-top-4 duration-700">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">Compliant acquisition</Badge>
              <Badge className="border-transparent bg-sky-500/15 text-sky-700 dark:text-sky-200">
                {getTradeFocusMarketingLabel(businessProfile?.primary_trade_focus)} focus
              </Badge>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Dispatch Audit Outreach
            </h1>
            <p className="max-w-3xl text-muted-foreground">
              Manual, reviewed outreach assets for turning high-urgency trade
              operators into dispatch-audit requests without scraping phone lists or
              automating spammy form submissions.
            </p>
          </div>

          <Link
            href={bookingUrl}
            className={cn(buttonVariants({ variant: "default" }), "w-full sm:w-auto")}
          >
            <Link2 className="h-4 w-4" />
            Open Audit Link
          </Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-border/60">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>Audit Link Handoff</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Send people to a controlled intake path, not a loose inbox.
                </p>
              </div>
              <OutreachCopyActions text={bookingUrl} label="Copy Link" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-border/70 bg-muted/30 p-4">
              <p className="break-all font-mono text-sm">{bookingUrl}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <ReadinessItem
                complete={Boolean(businessProfile?.booking_url_slug)}
                label="Public audit slug"
              />
              <ReadinessItem
                complete={serviceAreaCount > 0}
                label={`${serviceAreaCount} service postcodes`}
              />
              <ReadinessItem
                complete={jobTypeCount > 0}
                label={`${jobTypeCount} job presets`}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle>Compliance Guardrails</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Keep the acquisition loop useful, identifiable, and opt-out safe.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              "Do not scrape mobile numbers or bulk-submit website forms.",
              "Use outreach only for consented, referred, existing, or manually reviewed business contacts.",
              "Identify who is sending the message and keep a simple opt-out path.",
              "Move any opt-out or wrong-number reply into suppression immediately.",
            ].map((item) => (
              <div key={item} className="flex items-start gap-3 text-sm">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                <span className="text-muted-foreground">{item}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border/60">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <CardTitle>{cadence.label}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 text-sm">
              <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                <span className="text-muted-foreground">Reviewed touches</span>
                <span className="font-semibold">{cadence.dailyTouches}/day</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                <span className="text-muted-foreground">Research blocks</span>
                <span className="font-semibold">{cadence.reviewBlocks}/day</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                <span className="text-muted-foreground">Callback slots</span>
                <span className="font-semibold">{cadence.callbackSlots}/day</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              This page intentionally stops at copy, cadence, and audit routing. It
              does not send messages or harvest prospects.
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-primary" />
              <CardTitle>Offer Readiness</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <ReadinessItem
              complete={canUseBaselineAutomations && Boolean(businessProfile?.missed_call_text_enabled)}
              label={
                canUseBaselineAutomations
                  ? "Missed-call text-back"
                  : "Missed-call text-back locked to Baseline"
              }
            />
            <ReadinessItem
              complete={canUseApexAutomations && Boolean(businessProfile?.quote_followup_enabled)}
              label={
                canUseApexAutomations
                  ? "48-hour quote nurture"
                  : "48-hour quote nurture locked to Apex"
              }
            />
            <ReadinessItem
              complete={canUseApexAutomations && Boolean(businessProfile?.review_request_enabled)}
              label={
                canUseApexAutomations
                  ? "Review extractor"
                  : "Review extractor locked to Apex"
              }
            />
            <div className="rounded-lg border border-border/70 bg-muted/30 p-3 text-sm text-muted-foreground">
              {automationCount} of 3 Zero-Leak automations are enabled for this workspace.
              Current plan: {getSubscriptionPlanLabel(subscriptionPlanKey)}.
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-primary" />
              <CardTitle>Positioning Rule</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Lead with the dispatch audit: missed emergency calls, cold quotes,
              and missing review proof. Do not pitch a generic booking app.
            </p>
            <p>
              If the business shows interest, move them to the audit link and let
              the structured intake create the lead record.
            </p>
          </CardContent>
        </Card>
      </div>

      <section className="space-y-4">
        <div className="section-heading">
          <div className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            <h2>Outreach Scripts</h2>
          </div>
          <p>
            Copy blocks for reviewed, one-to-one outreach. Each script points back to
            the public dispatch-audit intake.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {scripts.map((script) => (
            <Card key={script.id} className="flex flex-col border-border/60">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Badge variant="outline">{script.channel}</Badge>
                    <CardTitle className="mt-3">{script.title}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {script.description}
                    </p>
                  </div>
                  <OutreachCopyActions text={script.body} />
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <pre className="min-h-56 whitespace-pre-wrap rounded-xl border border-border/70 bg-muted/30 p-4 text-sm leading-6 text-foreground">
                  {script.body}
                </pre>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="section-heading">
          <h2>MRR Projection</h2>
          <p>
            Use the same Baseline/Apex math from the public site while planning daily
            manual outreach volume.
          </p>
        </div>
        <CapitalExtractionSimulator />
      </section>
    </div>
  );
}
