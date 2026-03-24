import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getResend } from '@/lib/resend';
import { ImmediateFollowupEmail } from '@/emails/immediate-followup-email';
import { TwentyFourHourFollowupEmail } from '@/emails/twentyfour-followup-email';
import { FortyEightHourFollowupEmail } from '@/emails/fortyeight-followup-email';

export async function GET(request: NextRequest) {
  try {
    const resend = getResend();

    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Cron runs without an authenticated user; use service-role client to bypass RLS.
    const supabase = createAdminClient();

    // Fetch leads that need follow-up
    const { data: leads, error: fetchError } = await supabase
      .from('leads')
      .select(`
        id,
        business_id,
        name,
        email,
        phone,
        suburb,
        job_type,
        preferred_date,
        preferred_time_window,
        notes,
        followup_step,
        status,
        business_profile!inner (
          business_name,
          reply_to_email
        )
      `)
      .in('status', ['new', 'contacted'])
      .in('followup_step', [0, 1, 2])
      .lte('next_followup_at', new Date().toISOString())
      .not('email', 'is', null)
      .neq('email', '')
      .limit(50);

    if (fetchError) {
      console.error('Fetch error:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch leads' },
        { status: 500 }
      );
    }

    const results = {
      processed: 0,
      sent: 0,
      errors: 0,
      stale: 0,
    };

    // Process each lead
    for (const lead of leads || []) {
      results.processed++;

      try {
        const businessProfile = Array.isArray(lead.business_profile)
          ? lead.business_profile[0]
          : lead.business_profile;

        const businessName = businessProfile?.business_name || 'TradieFlow';
        // IMPORTANT: Resend requires the `from` domain to be verified.
        // Keep business emails as Reply-To only.
        const senderEmail =
          process.env.RESEND_SENDER_EMAIL ||
          process.env.RESEND_FROM_EMAIL ||
          (process.env.NODE_ENV !== 'production' ? 'onboarding@resend.dev' : undefined);

        if (!senderEmail) {
          throw new Error(
            'Missing verified sender: set RESEND_SENDER_EMAIL (or RESEND_FROM_EMAIL) to a verified Resend domain address.'
          );
        }

        const replyToEmail =
          businessProfile?.reply_to_email || process.env.RESEND_REPLY_TO_EMAIL;

        let emailComponent;
        let subject;
        let nextStep = lead.followup_step + 1;
        let nextFollowupAt: Date | null = null;
        let newStatus = lead.status;

        // Determine which email to send
        switch (lead.followup_step) {
          case 0: // Immediate
            subject = `TradieFlow setup request received`;
            emailComponent = ImmediateFollowupEmail({
              name: lead.name,
              businessName,
              suburb: lead.suburb,
              jobType: lead.job_type,
            });
            nextFollowupAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // +24h
            newStatus = 'contacted';
            break;

          case 1: // 24h follow-up
            subject = `Quick follow-up - ready to set up TradieFlow?`;
            emailComponent = TwentyFourHourFollowupEmail({
              name: lead.name,
              businessName,
              jobType: lead.job_type,
            });
            nextFollowupAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // +48h
            break;

          case 2: // 48h follow-up (last)
            subject = `Last check-in - should I close your setup request?`;
            emailComponent = FortyEightHourFollowupEmail({
              name: lead.name,
              businessName,
            });
            nextStep = 3;
            newStatus = 'stale';
            results.stale++;
            break;

          default:
            continue;
        }

        // Send email via Resend
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

        results.sent++;

        // Update lead
        await supabase
          .from('leads')
          .update({
            followup_step: nextStep,
            last_contacted_at: new Date().toISOString(),
            next_followup_at: nextFollowupAt?.toISOString() || null,
            status: newStatus,
          })
          .eq('id', lead.id);

        // Log event
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
        results.errors++;
        console.error(`Error processing lead ${lead.id}:`, error);

        // Log error event
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
