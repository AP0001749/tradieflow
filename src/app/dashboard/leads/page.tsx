import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ZeroLeakReadiness } from '@/components/dashboard/zero-leak-readiness';
import { getLeads } from './actions';
import LeadsTable from './leads-table';

export default async function LeadsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Check if business profile exists
  const { data: profile, error: profileError } = await supabase
    .from('business_profile')
    .select(
      'id, booking_url_slug, missed_call_text_enabled, quote_followup_enabled, quote_followup_delay_hours, review_request_enabled, review_request_delay_hours, google_review_url'
    )
    .eq('user_id', user.id)
    .single();

  if (profileError && profileError.code !== 'PGRST116') {
    throw profileError;
  }

  const leads = profile ? await getLeads() : [];

  return (
    <div className="space-y-8">
      <section className="section-panel">
        <div className="section-heading">
          <span className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Dashboard</span>
          <h1>Leads</h1>
          <p className="text-muted-foreground">
            Manage demo requests, monitor follow-up progress, and keep your Zero-Leak setup ready for activation.
          </p>
        </div>
      </section>

      {!profile && (
        <section className="section-card">
          <p className="text-sm text-yellow-800">
            You need to set up your business profile first.{' '}
            <Link href="/dashboard/settings" className="underline font-medium">
              Go to Settings
            </Link>
          </p>
        </section>
      )}

      {profile && (
        <ZeroLeakReadiness
          missedCallTextEnabled={Boolean(profile.missed_call_text_enabled)}
          quoteFollowupEnabled={Boolean(profile.quote_followup_enabled)}
          quoteFollowupDelayHours={profile.quote_followup_delay_hours ?? 48}
          reviewRequestEnabled={Boolean(profile.review_request_enabled)}
          reviewRequestDelayHours={profile.review_request_delay_hours ?? 24}
          googleReviewUrl={profile.google_review_url}
        />
      )}

      <section className="section-card">
        <LeadsTable
          leads={leads}
          bookingUrlSlug={profile?.booking_url_slug ?? null}
        />
      </section>
    </div>
  );
}
