import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { LeadActivityFeed } from '@/components/dashboard/lead-activity-feed';
import { LeadChannelSummary } from '@/components/dashboard/lead-channel-summary';
import { LeadResponseSlaSummary } from '@/components/dashboard/lead-response-sla-summary';
import { ZeroLeakReadiness } from '@/components/dashboard/zero-leak-readiness';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  getLeadUrgencyBadgeClassName,
  getLeadUrgencyLabel,
  isLeadResponseOverdue,
} from '@/lib/lead-triage';
import { getEffectiveSubscriptionPlanKey } from '@/lib/pricing';
import { getLeads, getRecentLeadEvents } from './actions';
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
      'id, booking_url_slug, missed_call_text_enabled, missed_call_forwarding_number, twilio_phone_number, quote_followup_enabled, quote_followup_delay_hours, review_request_enabled, review_request_delay_hours, google_review_url'
    )
    .eq('user_id', user.id)
    .single();

  if (profileError && profileError.code !== 'PGRST116') {
    throw profileError;
  }

  const { data: subscriptionProfile } = await supabase
    .from('profiles')
    .select('subscription_tier, subscription_plan_key, subscription_status')
    .eq('user_id', user.id)
    .maybeSingle();
  const subscriptionPlanKey = getEffectiveSubscriptionPlanKey({
    subscriptionPlanKey: subscriptionProfile?.subscription_plan_key,
    subscriptionTier: subscriptionProfile?.subscription_tier,
    subscriptionStatus: subscriptionProfile?.subscription_status,
  });

  const leads = profile ? await getLeads() : [];
  const recentLeadEvents =
    profile && leads.length > 0
      ? await getRecentLeadEvents(leads.map((lead) => lead.id))
      : [];
  const urgencyCards = ['emergency', 'same_day', 'scheduled', 'quote'].map((urgency) => ({
    urgency,
    count: leads.filter((lead) => lead.lead_urgency === urgency).length,
    overdue: leads.filter((lead) =>
      lead.lead_urgency === urgency &&
      isLeadResponseOverdue(lead.response_due_at, lead.status),
    ).length,
  }));

  return (
    <div className="space-y-8">
      <section className="section-panel">
        <div className="section-heading">
          <span className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Dashboard</span>
          <h1>Leads</h1>
          <p className="text-muted-foreground">
            Manage dispatch-audit requests, monitor follow-up progress, and keep your Zero-Leak recovery stack armed.
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
          subscriptionPlanKey={subscriptionPlanKey}
          missedCallTextEnabled={Boolean(profile.missed_call_text_enabled)}
          missedCallForwardingNumber={profile.missed_call_forwarding_number}
          twilioPhoneNumber={profile.twilio_phone_number}
          quoteFollowupEnabled={Boolean(profile.quote_followup_enabled)}
          quoteFollowupDelayHours={profile.quote_followup_delay_hours ?? 48}
          reviewRequestEnabled={Boolean(profile.review_request_enabled)}
          reviewRequestDelayHours={profile.review_request_delay_hours ?? 24}
          googleReviewUrl={profile.google_review_url}
        />
      )}

      {profile ? (
        <section className="section-card space-y-5">
          <div className="section-heading">
            <h2>Emergency Triage</h2>
            <p>
              Sort inbound HVAC, plumbing, and electrical leads by response lane
              before they leak to the next Google result.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {urgencyCards.map((card) => (
              <Card key={card.urgency} className="space-y-3 border-border/60 p-5">
                <div className="flex items-center justify-between gap-3">
                  <Badge className={getLeadUrgencyBadgeClassName(card.urgency)}>
                    {getLeadUrgencyLabel(card.urgency)}
                  </Badge>
                  {card.overdue > 0 ? (
                    <Badge className="border-transparent bg-rose-500/15 text-rose-700 dark:text-rose-200">
                      {card.overdue} overdue
                    </Badge>
                  ) : null}
                </div>
                <p className="text-3xl font-semibold tracking-tight">{card.count}</p>
                <p className="text-sm text-muted-foreground">
                  {card.urgency === 'emergency'
                    ? '15-minute response target'
                    : card.urgency === 'same_day'
                      ? '1-hour response target'
                      : card.urgency === 'quote'
                        ? '24-hour quote response target'
                        : '4-hour response target'}
                </p>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {profile ? <LeadResponseSlaSummary leads={leads} /> : null}

      {profile ? <LeadChannelSummary leads={leads} /> : null}

      {profile ? <LeadActivityFeed leads={leads} events={recentLeadEvents} /> : null}

      <section className="section-card">
        <LeadsTable
          leads={leads}
          bookingUrlSlug={profile?.booking_url_slug ?? null}
        />
      </section>
    </div>
  );
}
