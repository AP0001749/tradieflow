import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getResend } from '@/lib/resend';
import { ImmediateFollowupEmail } from '@/emails/immediate-followup-email';
import { TwentyFourHourFollowupEmail } from '@/emails/twentyfour-followup-email';
import { FortyEightHourFollowupEmail } from '@/emails/fortyeight-followup-email';

type ClaimedLead = {
  id: string;
  business_id: string;
  name: string;
  email: string;
  phone: string | null;
  suburb: string | null;
  job_type: string | null;
  preferred_date: string | null;
  preferred_time_window: string | null;
  notes: string | null;
  followup_step: number;
  status: string;
  business_name: string | null;
  reply_to_email: string | null;
};

export async function GET(request: NextRequest) {
  try {
    const resend = getResend();

    const authHeader = request.headers.get('authorization');
    if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();

    const { data: leads, error: claimError } = await supabase.rpc('claim_due_leads', {
      limit_count: 50,
    });

    if (claimError) {
      console.error('Claim error:', claimError);
      return NextResponse.json(
        { error: 'Failed to claim leads' },
        { status: 500 }
      );
    }

    const results = {
      processed: 0,
      sent: 0,
      errors: 0,
      stale: 0,
    };

    for (const lead of (leads || []) as ClaimedLead[]) {
      results.processed += 1;

      try {
        const businessName = lead.business_name || 'TradieFlow';
        const senderEmail =
          process.env.RESEND_SENDER_EMAIL ||
          process.env.RESEND_FROM_EMAIL ||
          (process.env.NODE_ENV !== 'production' ? 'onboarding@resend.dev' : undefined);

        if (!senderEmail) {
          throw new Error(
            'Missing verified sender: set RESEND_SENDER_EMAIL (or RESEND_FROM_EMAIL) to a verified Resend domain address.'
          );
        }

        const replyToEmail = lead.reply_to_email || process.env.RESEND_REPLY_TO_EMAIL;

        let emailComponent;
        let subject;
        let nextStep = lead.followup_step + 1;
        let nextFollowupAt: Date | null = null;
        let newStatus = lead.status;

        switch (lead.followup_step) {
          case 0:
            subject = `TradieFlow setup request received`;
            emailComponent = ImmediateFollowupEmail({
              name: lead.name,
              businessName,
              suburb: lead.suburb ?? undefined,
              jobType: lead.job_type ?? undefined,
            });
            nextFollowupAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
            newStatus = 'contacted';
            break;

          case 1:
            subject = `Quick follow-up - ready to set up TradieFlow?`;
            emailComponent = TwentyFourHourFollowupEmail({
              name: lead.name,
              businessName,
              jobType: lead.job_type ?? undefined,
            });
            nextFollowupAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
            break;

          case 2:
            subject = `Last check-in - should I close your setup request?`;
            emailComponent = FortyEightHourFollowupEmail({
              name: lead.name,
              businessName,
            });
            nextStep = 3;
            newStatus = 'stale';
            results.stale += 1;
            break;

          default:
            await supabase
              .from('leads')
              .update({
                processing: false,
                processing_started_at: null,
              })
              .eq('id', lead.id);
            continue;
        }

        const { error: emailError } = await resend.emails.send({
          from: senderEmail,
          ...(replyToEmail ? { replyTo: replyToEmail } : {}),
          to: lead.email,
          subject,
          react: emailComponent,
        });

        if (emailError) {
          throw emailError;
        }

        results.sent += 1;

        await supabase
          .from('leads')
          .update({
            followup_step: nextStep,
            last_contacted_at: new Date().toISOString(),
            next_followup_at: nextFollowupAt?.toISOString() || null,
            status: newStatus,
            processing: false,
            processing_started_at: null,
          })
          .eq('id', lead.id);

        await supabase.from('lead_events').insert({
          lead_id: lead.id,
          event_type: 'email_sent',
          meta: {
            step: lead.followup_step,
            subject,
            next_step: nextStep,
          },
        });
      } catch (error) {
        results.errors += 1;
        console.error(`Error processing lead ${lead.id}:`, error);

        await supabase
          .from('leads')
          .update({
            processing: false,
            processing_started_at: null,
          })
          .eq('id', lead.id);

        await supabase.from('lead_events').insert({
          lead_id: lead.id,
          event_type: 'error',
          meta: {
            error: error instanceof Error ? error.message : 'Unknown error',
            step: lead.followup_step,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      {
        error: 'Cron job failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
