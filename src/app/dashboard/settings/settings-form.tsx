'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { normalizeBookingUrlSlug } from '@/lib/booking';
import { getTradeFocusJobTypePresets } from '@/lib/job-type-options';
import {
  getSubscriptionPlanLabel,
  hasApexAutomationAccess,
  hasBaselineAutomationAccess,
  type SubscriptionPlanKey,
} from '@/lib/pricing';
import {
  formatDispatchRosterText,
  normalizeDispatchRoster,
} from '@/lib/dispatch-roster';
import {
  AFTER_HOURS_COVERAGE_OPTIONS,
  DISPATCH_RADIUS_OPTIONS,
  DISPATCH_TEAM_SIZE_OPTIONS,
} from '@/lib/dispatch-profile';
import {
  DEFAULT_MISSED_CALL_TEXT_TEMPLATE,
  DEFAULT_QUOTE_FOLLOWUP_TEMPLATE,
  DEFAULT_REVIEW_REQUEST_TEMPLATE,
  coerceAutomationTemplate,
} from '@/lib/zero-leak';
import {
  getTradeFocusLabel,
  PRIMARY_TRADE_FOCUS_OPTIONS,
} from '@/lib/trade-focus';
import { updateBusinessProfile } from './actions';

interface BusinessProfile {
  id: string;
  business_name: string;
  primary_trade_focus: string | null;
  reply_to_email: string;
  google_review_url: string | null;
  service_area_postcodes: string[];
  default_job_types: string[];
  booking_url_slug: string | null;
  team_size: string | null;
  after_hours_coverage: string | null;
  dispatch_radius: string | null;
  dispatch_roster: string[];
  missed_call_text_enabled: boolean | null;
  missed_call_text_template: string | null;
  missed_call_forwarding_number: string | null;
  twilio_phone_number: string | null;
  emergency_response_sla_minutes: number | null;
  same_day_response_sla_minutes: number | null;
  scheduled_response_sla_minutes: number | null;
  quote_response_sla_minutes: number | null;
  quote_followup_enabled: boolean | null;
  quote_followup_delay_hours: number | null;
  quote_followup_template: string | null;
  review_request_enabled: boolean | null;
  review_request_delay_hours: number | null;
  review_request_template: string | null;
}

interface SettingsFormProps {
  profile: BusinessProfile | null;
  subscriptionPlanKey: SubscriptionPlanKey;
}

function parsePositiveInteger(value: FormDataEntryValue | null, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.round(parsed);
}

export default function SettingsForm({
  profile,
  subscriptionPlanKey,
}: SettingsFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [bookingSlug, setBookingSlug] = useState(profile?.booking_url_slug || '');
  const [primaryTradeFocus, setPrimaryTradeFocus] = useState(
    profile?.primary_trade_focus || 'mixed_trade'
  );
  const [defaultJobTypesValue, setDefaultJobTypesValue] = useState(
    profile?.default_job_types?.join(', ') ||
      getTradeFocusJobTypePresets(profile?.primary_trade_focus).join(', ')
  );
  const tradePresetOptions = getTradeFocusJobTypePresets(primaryTradeFocus);
  const canUseApexAutomations = hasApexAutomationAccess(subscriptionPlanKey);
  const canUseBaselineAutomations = hasBaselineAutomationAccess(subscriptionPlanKey);
  const planLabel = getSubscriptionPlanLabel(subscriptionPlanKey);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setCopyMessage(null);

    const formData = new FormData(e.currentTarget);

    const postcodes = (formData.get('service_area_postcodes') as string)
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p);

    const jobTypes = (formData.get('default_job_types') as string)
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t);
    const dispatchRoster = normalizeDispatchRoster(
      formData.get('dispatch_roster') as string
    );

    const businessName = formData.get('business_name') as string;
    const requestedSlug = (formData.get('booking_url_slug') as string) || businessName;
    const normalizedSlug = normalizeBookingUrlSlug(requestedSlug);

    try {
      await updateBusinessProfile({
        business_name: businessName,
        primary_trade_focus: formData.get('primary_trade_focus') as string,
        reply_to_email: formData.get('reply_to_email') as string,
        google_review_url: formData.get('google_review_url') as string,
        service_area_postcodes: postcodes,
        default_job_types: jobTypes,
        booking_url_slug: normalizedSlug,
        team_size: formData.get('team_size') as string,
        after_hours_coverage: formData.get('after_hours_coverage') as string,
        dispatch_radius: formData.get('dispatch_radius') as string,
        dispatch_roster: dispatchRoster,
        missed_call_text_enabled: formData.get('missed_call_text_enabled') === 'enabled',
        missed_call_text_template: coerceAutomationTemplate(
          formData.get('missed_call_text_template') as string,
          DEFAULT_MISSED_CALL_TEXT_TEMPLATE
        ),
        missed_call_forwarding_number: formData.get('missed_call_forwarding_number') as string,
        twilio_phone_number: formData.get('twilio_phone_number') as string,
        emergency_response_sla_minutes: parsePositiveInteger(
          formData.get('emergency_response_sla_minutes'),
          15
        ),
        same_day_response_sla_minutes: parsePositiveInteger(
          formData.get('same_day_response_sla_minutes'),
          60
        ),
        scheduled_response_sla_minutes: parsePositiveInteger(
          formData.get('scheduled_response_sla_minutes'),
          240
        ),
        quote_response_sla_minutes: parsePositiveInteger(
          formData.get('quote_response_sla_minutes'),
          1440
        ),
        quote_followup_enabled: formData.get('quote_followup_enabled') === 'enabled',
        quote_followup_delay_hours: parsePositiveInteger(
          formData.get('quote_followup_delay_hours'),
          48
        ),
        quote_followup_template: coerceAutomationTemplate(
          formData.get('quote_followup_template') as string,
          DEFAULT_QUOTE_FOLLOWUP_TEMPLATE
        ),
        review_request_enabled: formData.get('review_request_enabled') === 'enabled',
        review_request_delay_hours: parsePositiveInteger(
          formData.get('review_request_delay_hours'),
          24
        ),
        review_request_template: coerceAutomationTemplate(
          formData.get('review_request_template') as string,
          DEFAULT_REVIEW_REQUEST_TEMPLATE
        ),
      });

      setBookingSlug(normalizedSlug);
      toast.success("Settings saved");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || '';
  const effectiveSlug =
    bookingSlug || normalizeBookingUrlSlug(profile?.business_name || '') || 'your-business';
  const normalizedAppUrl = appUrl.replace(/\/+$/, '');
  const onboardingFormUrl = normalizedAppUrl
    ? `${normalizedAppUrl}/book/${effectiveSlug}`
    : `/book/${effectiveSlug}`;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Business Information</CardTitle>
          <CardDescription>
            This information powers your public funnel, trade-specific intake, and automated follow-up
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="form-grid">
            <div className="space-y-2">
              <Label htmlFor="business_name">Business Name *</Label>
              <Input
                id="business_name"
                name="business_name"
                required
                defaultValue={profile?.business_name || ''}
                placeholder="Western Climate Air"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="primary_trade_focus">Primary Trade Focus</Label>
              <Select
                id="primary_trade_focus"
                name="primary_trade_focus"
                value={primaryTradeFocus}
                onChange={(event) => {
                  const nextTradeFocus = event.target.value;
                  const currentPresetString =
                    getTradeFocusJobTypePresets(primaryTradeFocus).join(', ');

                  setPrimaryTradeFocus(nextTradeFocus);

                  if (
                    !defaultJobTypesValue.trim() ||
                    defaultJobTypesValue === currentPresetString
                  ) {
                    setDefaultJobTypesValue(
                      getTradeFocusJobTypePresets(nextTradeFocus).join(', ')
                    );
                  }
                }}
              >
                {PRIMARY_TRADE_FOCUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
              <p className="text-xs text-muted-foreground">
                This tunes public service-type suggestions and keeps the workspace framed around your main trade lane.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="booking_url_slug">Public Lead Link Slug *</Label>
            <Input
              id="booking_url_slug"
              name="booking_url_slug"
              required
              value={bookingSlug}
              onChange={(event) => {
                setBookingSlug(normalizeBookingUrlSlug(event.target.value));
              }}
              placeholder="western-climate-air"
            />
            <p className="text-xs text-muted-foreground">
              Lowercase letters, numbers, and hyphens only. This becomes your public
              dispatch-audit and lead-capture link.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reply_to_email">Reply-To Email *</Label>
            <Input
              id="reply_to_email"
              name="reply_to_email"
              type="email"
              required
              defaultValue={profile?.reply_to_email || ''}
              placeholder="hello@yourcompany.com"
            />
            <p className="text-xs text-muted-foreground">
              Leads and quote replies will route to this address
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="google_review_url">Google Review URL (Optional)</Label>
            <Input
              id="google_review_url"
              name="google_review_url"
              type="url"
              defaultValue={profile?.google_review_url || ''}
              placeholder="https://g.page/r/..."
            />
            <p className="text-xs text-muted-foreground">
              This is used for the post-payment review extractor flow
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dispatch Profile</CardTitle>
          <CardDescription>
            Store the operating model your team actually runs so rollout and routing stay grounded in reality
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="form-grid">
            <div className="space-y-2">
              <Label htmlFor="team_size">Team Size</Label>
              <Select
                id="team_size"
                name="team_size"
                defaultValue={profile?.team_size || ''}
              >
                <option value="">Select team size</option>
                {DISPATCH_TEAM_SIZE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="after_hours_coverage">After-Hours Coverage</Label>
              <Select
                id="after_hours_coverage"
                name="after_hours_coverage"
                defaultValue={profile?.after_hours_coverage || ''}
              >
                <option value="">Select coverage</option>
                {AFTER_HOURS_COVERAGE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dispatch_radius">Dispatch Radius</Label>
              <Select
                id="dispatch_radius"
                name="dispatch_radius"
                defaultValue={profile?.dispatch_radius || ''}
              >
                <option value="">Select radius</option>
                {DISPATCH_RADIUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Use the same operating assumptions you share during the dispatch audit so
            lead capture, after-hours coverage, and service handoff stay aligned.
          </p>

          <div className="space-y-2">
            <Label htmlFor="dispatch_roster">Dispatch Roster</Label>
            <Textarea
              id="dispatch_roster"
              name="dispatch_roster"
              rows={4}
              defaultValue={formatDispatchRosterText(profile?.dispatch_roster)}
              placeholder={'Sam - Van 1\nJess - Installs\nAfter-hours roster'}
            />
            <p className="text-xs text-muted-foreground">
              One crew or technician per line. These become assignment shortcuts across
              the dispatch desk and job forms.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Service Areas</CardTitle>
          <CardDescription>
            Configure the suburbs and job types you want the funnel to speak to
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="service_area_postcodes">Service Area Postcodes</Label>
            <Input
              id="service_area_postcodes"
              name="service_area_postcodes"
              defaultValue={profile?.service_area_postcodes?.join(', ') || ''}
              placeholder="3029, 3030, 3038"
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated list of postcodes for your response footprint
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="default_job_types">Default Job Types</Label>
            <Input
              id="default_job_types"
              name="default_job_types"
              value={defaultJobTypesValue}
              onChange={(event) => {
                setDefaultJobTypesValue(event.target.value);
              }}
              placeholder={tradePresetOptions.join(', ')}
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated list of job types you offer. These drive the public dispatch-audit suggestions for your trade focus.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setDefaultJobTypesValue(tradePresetOptions.join(', '));
                }}
              >
                Load {getTradeFocusLabel(primaryTradeFocus)} Preset
              </Button>
              {tradePresetOptions.map((option) => (
                <span
                  key={option}
                  className="rounded-full border border-border/70 bg-muted/40 px-3 py-1 text-xs text-muted-foreground"
                >
                  {option}
                </span>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Emergency Response SLAs</CardTitle>
          <CardDescription>
            Set the response promises used for triage due times and SLA hit/miss scoring
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="form-grid">
            <div className="space-y-2">
              <Label htmlFor="emergency_response_sla_minutes">Emergency SLA (minutes)</Label>
              <Input
                id="emergency_response_sla_minutes"
                name="emergency_response_sla_minutes"
                type="number"
                min={1}
                max={10080}
                step={1}
                defaultValue={profile?.emergency_response_sla_minutes ?? 15}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="same_day_response_sla_minutes">Same-Day SLA (minutes)</Label>
              <Input
                id="same_day_response_sla_minutes"
                name="same_day_response_sla_minutes"
                type="number"
                min={1}
                max={10080}
                step={1}
                defaultValue={profile?.same_day_response_sla_minutes ?? 60}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="scheduled_response_sla_minutes">Scheduled SLA (minutes)</Label>
              <Input
                id="scheduled_response_sla_minutes"
                name="scheduled_response_sla_minutes"
                type="number"
                min={1}
                max={10080}
                step={1}
                defaultValue={profile?.scheduled_response_sla_minutes ?? 240}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quote_response_sla_minutes">Quote SLA (minutes)</Label>
              <Input
                id="quote_response_sla_minutes"
                name="quote_response_sla_minutes"
                type="number"
                min={1}
                max={10080}
                step={1}
                defaultValue={profile?.quote_response_sla_minutes ?? 1440}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            These values are applied when a new lead lands or when an operator
            reclassifies triage. Existing lead SLA targets are preserved unless
            you save triage again on that lead.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Zero-Leak Automations</CardTitle>
          <CardDescription>
            Set the copy and timing for missed-call recovery, quote nurture, and review extraction
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-4 text-sm text-muted-foreground">
            These settings define the workflow blueprint and customer-facing message copy.
            Quote nurture and review requests can now dispatch by Twilio SMS when the
            workspace has an owned number and the client has a mobile, with email fallback
            through the Zero-Leak cron route when SMS is unavailable. Keep
            <code className="mx-1">Reply STOP to opt out</code>
            in automated SMS templates so inbound opt-outs can suppress future messages.
          </div>
          {!canUseApexAutomations ? (
            <div className="flex flex-col gap-3 rounded-xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-100 md:flex-row md:items-center md:justify-between">
              <p>
                Current plan: {planLabel}. Missed-call text-back requires Baseline or
                Apex; quote nurture and review extraction require Apex. You can edit
                the copy now, but locked automations will stay disabled until the
                workspace upgrades.
              </p>
              <Link
                href="/dashboard/billing"
                className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg border border-amber-500/30 bg-background px-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
              >
                View Billing
              </Link>
            </div>
          ) : null}

          <div className="rounded-xl border border-border/60 p-4 space-y-4">
            <div className="space-y-1">
              <h3 className="text-base font-semibold">Missed Call Text Back</h3>
              <p className="text-sm text-muted-foreground">
                Configure the message you want TradieFlow to send when a tradie cannot answer immediately.
              </p>
            </div>
            <div className="form-grid">
              <div className="space-y-2">
                <Label htmlFor="missed_call_text_enabled">Status</Label>
                <Select
                  id="missed_call_text_enabled"
                  name="missed_call_text_enabled"
                  defaultValue={
                    canUseBaselineAutomations && profile?.missed_call_text_enabled
                      ? 'enabled'
                      : 'disabled'
                  }
                  disabled={!canUseBaselineAutomations}
                >
                  <option value="disabled">Disabled</option>
                  <option value="enabled">Enabled</option>
                </Select>
                {!canUseBaselineAutomations ? (
                  <p className="text-xs text-muted-foreground">
                    Baseline or Apex required to enable missed-call text-back.
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="twilio_phone_number">Twilio Number</Label>
                <Input
                  id="twilio_phone_number"
                  name="twilio_phone_number"
                  type="tel"
                  defaultValue={profile?.twilio_phone_number || ''}
                  placeholder="+61390000000"
                />
                <p className="text-xs text-muted-foreground">
                  The owned number that receives customer calls.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="missed_call_forwarding_number">Forward Calls To</Label>
                <Input
                  id="missed_call_forwarding_number"
                  name="missed_call_forwarding_number"
                  type="tel"
                  defaultValue={profile?.missed_call_forwarding_number || ''}
                  placeholder="+61400000000"
                />
                <p className="text-xs text-muted-foreground">
                  Tradie or dispatcher number dialled for 15 seconds first.
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="missed_call_text_template">Message Template</Label>
              <Textarea
                id="missed_call_text_template"
                name="missed_call_text_template"
                rows={4}
                defaultValue={coerceAutomationTemplate(
                  profile?.missed_call_text_template,
                  DEFAULT_MISSED_CALL_TEXT_TEMPLATE
                )}
              />
              <p className="text-xs text-muted-foreground">
                Supported placeholders: <code>{'{{business_name}}'}</code>
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-border/60 p-4 space-y-4">
            <div className="space-y-1">
              <h3 className="text-base font-semibold">Quote Nurture</h3>
              <p className="text-sm text-muted-foreground">
                Schedule the follow-up copy you want sent after a quote goes quiet.
              </p>
            </div>
            <div className="form-grid">
              <div className="space-y-2">
                <Label htmlFor="quote_followup_enabled">Status</Label>
                <Select
                  id="quote_followup_enabled"
                  name="quote_followup_enabled"
                  defaultValue={
                    canUseApexAutomations && profile?.quote_followup_enabled
                      ? 'enabled'
                      : 'disabled'
                  }
                  disabled={!canUseApexAutomations}
                >
                  <option value="disabled">Disabled</option>
                  <option value="enabled">Enabled</option>
                </Select>
                {!canUseApexAutomations ? (
                  <p className="text-xs text-muted-foreground">
                    Apex required to enable automated quote nurture.
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="quote_followup_delay_hours">Delay (hours)</Label>
                <Input
                  id="quote_followup_delay_hours"
                  name="quote_followup_delay_hours"
                  type="number"
                  min={1}
                  step={1}
                  defaultValue={profile?.quote_followup_delay_hours ?? 48}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quote_followup_template">Message Template</Label>
              <Textarea
                id="quote_followup_template"
                name="quote_followup_template"
                rows={4}
                defaultValue={coerceAutomationTemplate(
                  profile?.quote_followup_template,
                  DEFAULT_QUOTE_FOLLOWUP_TEMPLATE
                )}
              />
              <p className="text-xs text-muted-foreground">
                Supported placeholders: <code>{'{{contact_name}}'}</code>, <code>{'{{business_name}}'}</code>, <code>{'{{job_title}}'}</code>, <code>{'{{quote_amount}}'}</code>. Keep a STOP opt-out line for SMS delivery.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-border/60 p-4 space-y-4">
            <div className="space-y-1">
              <h3 className="text-base font-semibold">Review Extractor</h3>
              <p className="text-sm text-muted-foreground">
                Configure the follow-up request that goes out by SMS or email after a paid invoice lands.
              </p>
            </div>
            <div className="form-grid">
              <div className="space-y-2">
                <Label htmlFor="review_request_enabled">Status</Label>
                <Select
                  id="review_request_enabled"
                  name="review_request_enabled"
                  defaultValue={
                    canUseApexAutomations && profile?.review_request_enabled
                      ? 'enabled'
                      : 'disabled'
                  }
                  disabled={!canUseApexAutomations}
                >
                  <option value="disabled">Disabled</option>
                  <option value="enabled">Enabled</option>
                </Select>
                {!canUseApexAutomations ? (
                  <p className="text-xs text-muted-foreground">
                    Apex required to enable automated review extraction.
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="review_request_delay_hours">Delay (hours)</Label>
                <Input
                  id="review_request_delay_hours"
                  name="review_request_delay_hours"
                  type="number"
                  min={1}
                  step={1}
                  defaultValue={profile?.review_request_delay_hours ?? 24}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="review_request_template">Message Template</Label>
              <Textarea
                id="review_request_template"
                name="review_request_template"
                rows={4}
                defaultValue={coerceAutomationTemplate(
                  profile?.review_request_template,
                  DEFAULT_REVIEW_REQUEST_TEMPLATE
                )}
              />
              <p className="text-xs text-muted-foreground">
                Supported placeholders: <code>{'{{contact_name}}'}</code>, <code>{'{{business_name}}'}</code>, <code>{'{{google_review_url}}'}</code>, <code>{'{{job_title}}'}</code>, <code>{'{{invoice_amount}}'}</code>. Keep a STOP opt-out line for SMS delivery.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Public Lead Capture Link</CardTitle>
          <CardDescription>
            Share this URL to receive dispatch-audit requests and routed leads
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Input readOnly value={onboardingFormUrl} className="font-mono text-sm" />
            <Button
              type="button"
              variant="outline"
              disabled={!normalizedAppUrl}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(onboardingFormUrl);
                  setCopyMessage('Copied public lead link to clipboard.');
                } catch {
                  setCopyMessage('Could not copy automatically. You can still copy the link manually.');
                }
              }}
            >
              Copy
            </Button>
          </div>
          {!normalizedAppUrl ? (
            <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
              Set <code>NEXT_PUBLIC_APP_URL</code> to generate a shareable absolute lead link.
            </p>
          ) : null}
          {copyMessage ? (
            <p className="mt-2 text-xs text-muted-foreground">{copyMessage}</p>
          ) : null}
          <p className="mt-2 text-xs text-muted-foreground">
            Use this URL in Google Ads, website CTAs, and QR handouts
          </p>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </form>
  );
}
