'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { updateBusinessProfile } from './actions';
import { useRouter } from 'next/navigation';

interface BusinessProfile {
  id: string;
  business_name: string;
  reply_to_email: string;
  google_review_url: string | null;
  service_area_postcodes: string[];
  default_job_types: string[];
  booking_url_slug: string | null;
}

interface SettingsFormProps {
  profile: BusinessProfile | null;
}

export default function SettingsForm({ profile }: SettingsFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    const formData = new FormData(e.currentTarget);
    
    const postcodes = (formData.get('service_area_postcodes') as string)
      .split(',')
      .map(p => p.trim())
      .filter(p => p);

    const jobTypes = (formData.get('default_job_types') as string)
      .split(',')
      .map(t => t.trim())
      .filter(t => t);

    try {
      await updateBusinessProfile({
        business_name: formData.get('business_name') as string,
        reply_to_email: formData.get('reply_to_email') as string,
        google_review_url: formData.get('google_review_url') as string,
        service_area_postcodes: postcodes,
        default_job_types: jobTypes,
      });

      setSuccess(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  const onboardingFormUrl = process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/book`
    : '/book';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Business Information</CardTitle>
          <CardDescription>
            This information is used in automated emails sent to your leads
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
              placeholder="ABC Cleaning Services"
            />
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
              Leads will reply to this email address
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
              This will be sent to clients after job completion (future feature)
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Service Areas</CardTitle>
          <CardDescription>
            Configure which areas you service (optional)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="service_area_postcodes">Service Area Postcodes</Label>
            <Input
              id="service_area_postcodes"
              name="service_area_postcodes"
              defaultValue={profile?.service_area_postcodes?.join(', ') || ''}
              placeholder="2000, 2010, 2015"
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated list of postcodes (future: can be used for lead filtering)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="default_job_types">Default Job Types</Label>
            <Input
              id="default_job_types"
              name="default_job_types"
              defaultValue={profile?.default_job_types?.join(', ') || 'end_of_lease, regular, deep_clean'}
              placeholder="end_of_lease, regular, deep_clean"
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated list of job types you offer
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Onboarding Form</CardTitle>
          <CardDescription>
            Share this URL to receive setup/demo requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={onboardingFormUrl}
              className="font-mono text-sm"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(onboardingFormUrl);
                alert('Copied to clipboard!');
              }}
            >
              Copy
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Use this URL in your Google Ads campaigns and website CTAs
          </p>
        </CardContent>
      </Card>

      {error && (
        <div className="p-3 rounded-md border border-destructive/30 bg-destructive/10">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-3 rounded-md border border-emerald-500/30 bg-emerald-500/10">
          <p className="text-sm text-emerald-700 dark:text-emerald-200">Settings saved successfully!</p>
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </form>
  );
}
