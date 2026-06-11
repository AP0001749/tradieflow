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
import { AlertTriangle } from 'lucide-react';

const urgencyAccent: Record<string, string> = {
  emergency: 'border-l-4 border-rose-500',
  same_day:  'border-l-4 border-amber-500',
  scheduled: 'border-l-4 border-sky-500',
  quote:     'border-l-4 border-violet-500',
};

const urgencyIconBg: Record<string, string> = {
  emergency: 'bg-rose-500',
  same_day:  'bg-amber-500',
  scheduled: 'bg-sky-500',
  quote:     'bg-violet-500',
};

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
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/8 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <p className="text-sm text-amber-800 dark:text-amber-200">
            Business profile not set up yet.{' '}
            <Link href="/dashboard/settings" className="font-semibold underline underline-offset-2 hover:opacity-80">
              Go to Settings
            </Link>{' '}
            to configure your dispatch profile, service area, and automations.
          </p>
        </div>
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
              <Card
                key={card.urgency}
                className={`space-y-3 overflow-hidden border-border/60 p-5 ${urgencyAccent[card.urgency] ?? ''}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex h-2 w-2 rounded-full ${urgencyIconBg[card.urgency] ?? 'bg-muted'}`} />
                    <Badge className={getLeadUrgencyBadgeClassName(card.urgency)}>
                      {getLeadUrgencyLabel(card.urgency)}
                    </Badge>
                  </div>
                  {card.overdue > 0 ? (
                    <Badge className="border-transparent bg-rose-500/15 text-rose-700 dark:text-rose-200">
                      {card.overdue} overdue
                    </Badge>
                  ) : null}
                </div>
                <p className="text-3xl font-bold tracking-tight">{card.count}</p>
                <p className="text-xs text-muted-foreground">
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
