'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { normalizeBookingUrlSlug } from '@/lib/booking';
import {
  DEFAULT_MISSED_CALL_TEXT_TEMPLATE,
  DEFAULT_QUOTE_FOLLOWUP_TEMPLATE,
  DEFAULT_REVIEW_REQUEST_TEMPLATE,
  coerceAutomationTemplate,
} from '@/lib/zero-leak';
import { updateBusinessProfile } from './actions';

interface BusinessProfile {
  id: string;
  business_name: string;
  reply_to_email: string;
  google_review_url: string | null;
  service_area_postcodes: string[];
  default_job_types: string[];
  booking_url_slug: string | null;
  missed_call_text_enabled: boolean | null;
  missed_call_text_template: string | null;
  quote_followup_enabled: boolean | null;
  quote_followup_delay_hours: number | null;
  quote_followup_template: string | null;
  review_request_enabled: boolean | null;
  review_request_delay_hours: number | null;
  review_request_template: string | null;
}

interface SettingsFormProps {
  profile: BusinessProfile | null;
}

function parsePositiveInteger(value: FormDataEntryValue | null, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.round(parsed);
}

export default function SettingsForm({ profile }: SettingsFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [bookingSlug, setBookingSlug] = useState(profile?.booking_url_slug || '');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);
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

    const businessName = formData.get('business_name') as string;
    const requestedSlug = (formData.get('booking_url_slug') as string) || businessName;
    const normalizedSlug = normalizeBookingUrlSlug(requestedSlug);

    try {
      await updateBusinessProfile({
        business_name: businessName,
        reply_to_email: formData.get('reply_to_email') as string,
        google_review_url: formData.get('google_review_url') as string,
        service_area_postcodes: postcodes,
        default_job_types: jobTypes,
        booking_url_slug: normalizedSlug,
        missed_call_text_enabled: formData.get('missed_call_text_enabled') === 'enabled',
        missed_call_text_template: coerceAutomationTemplate(
          formData.get('missed_call_text_template') as string,
          DEFAULT_MISSED_CALL_TEXT_TEMPLATE
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
      setSuccess(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
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
            This information powers your public funnel and automated follow-up
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
            <Label htmlFor="booking_url_slug">Booking URL Slug *</Label>
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
              demo and lead-capture link.
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
              defaultValue={
                profile?.default_job_types?.join(', ') ||
                'split_system_service, emergency_callout, hot_water_service'
              }
              placeholder="split_system_service, emergency_callout, hot_water_service"
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated list of job types you offer
            </p>
          </div>
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
            Delivery integrations such as SMS or call-routing can be connected on top of
            this configuration next.
          </div>

          <div className="rounded-xl border border-border/60 p-4 space-y-4">
            <div className="space-y-1">
              <h3 className="text-base font-semibold">Missed Call Text Back</h3>
              <p className="text-sm text-muted-foreground">
                Configure the message you want TradieFlow to send when a tradie cannot answer immediately.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="missed_call_text_enabled">Status</Label>
              <Select
                id="missed_call_text_enabled"
                name="missed_call_text_enabled"
                defaultValue={profile?.missed_call_text_enabled ? 'enabled' : 'disabled'}
              >
                <option value="disabled">Disabled</option>
                <option value="enabled">Enabled</option>
              </Select>
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
                  defaultValue={profile?.quote_followup_enabled ? 'enabled' : 'disabled'}
                >
                  <option value="disabled">Disabled</option>
                  <option value="enabled">Enabled</option>
                </Select>
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
                Supported placeholders: <code>{'{{contact_name}}'}</code>, <code>{'{{business_name}}'}</code>
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-border/60 p-4 space-y-4">
            <div className="space-y-1">
              <h3 className="text-base font-semibold">Review Extractor</h3>
              <p className="text-sm text-muted-foreground">
                Configure the follow-up request that goes out after a paid invoice lands.
              </p>
            </div>
            <div className="form-grid">
              <div className="space-y-2">
                <Label htmlFor="review_request_enabled">Status</Label>
                <Select
                  id="review_request_enabled"
                  name="review_request_enabled"
                  defaultValue={profile?.review_request_enabled ? 'enabled' : 'disabled'}
                >
                  <option value="disabled">Disabled</option>
                  <option value="enabled">Enabled</option>
                </Select>
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
                Supported placeholders: <code>{'{{contact_name}}'}</code>, <code>{'{{business_name}}'}</code>, <code>{'{{google_review_url}}'}</code>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Demo / Lead Capture Form</CardTitle>
          <CardDescription>
            Share this URL to receive demo requests and routed leads
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
                  setCopyMessage('Copied booking link to clipboard.');
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
              Set <code>NEXT_PUBLIC_APP_URL</code> to generate a shareable absolute booking link.
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

      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      ) : null}

      {success ? (
        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3">
          <p className="text-sm text-emerald-700 dark:text-emerald-200">
            Settings saved successfully!
          </p>
        </div>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </form>
  );
}
