import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      business_name,
      your_name,
      mobile,
      email,
      service_area,
      service_type,
      abn,
      notes,
    } = body;

    // Validate required fields
    if (!your_name || !email || !mobile || !service_area || !service_type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Use service role for public lead capture to avoid RLS blocking inserts.
    const supabase = createAdminClient();

    // Get the first business profile (for MVP, assuming single tenant per deployment)
    // In production, you'd use booking_url_slug or subdomain routing
    const { data: businessProfile, error: businessError } = await supabase
      .from('business_profile')
      .select('id')
      .limit(1)
      .single();

    let businessProfileId = businessProfile?.id as string | undefined;

    if (businessError || !businessProfileId) {
      // Fallback for fresh deployments (MVP): create a default profile so leads can be captured.
      const { data: created, error: createError } = await supabase
        .from('business_profile')
        .insert({
          user_id: null,
          business_name: process.env.DEFAULT_BUSINESS_NAME || 'TradieFlow',
          reply_to_email: process.env.RESEND_FROM_EMAIL || 'noreply@tradieflow.com',
          google_review_url: null,
          service_area_postcodes: [],
          default_job_types: [],
        })
        .select('id')
        .single();

      if (createError || !created?.id) {
        console.error('Failed to create default business profile:', createError);
        return NextResponse.json(
          { error: 'Service not available yet' },
          { status: 503 }
        );
      }

      businessProfileId = created.id;
    }

    // Insert lead
    const combinedNotes = [
      business_name ? `Business: ${business_name}` : null,
      abn ? `ABN: ${abn}` : null,
      notes?.trim() ? notes.trim() : null,
    ]
      .filter(Boolean)
      .join(' | ')
      .trim() || null;

    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .insert({
        business_id: businessProfileId,
        source: 'book_page',
        status: 'new',
        name: your_name,
        email,
        phone: mobile,
        suburb: service_area,
        postcode: null,
        job_type: service_type,
        preferred_date: null,
        preferred_time_window: null,
        notes: combinedNotes,
      })
      .select()
      .single();

    if (leadError) {
      console.error('Lead creation error:', leadError);
      return NextResponse.json(
        { error: 'Failed to create lead' },
        { status: 500 }
      );
    }

    // Log event
    await supabase.from('lead_events').insert({
      lead_id: lead.id,
      event_type: 'created',
      meta: { source: 'book_page' },
    });

    return NextResponse.json({ success: true, lead_id: lead.id });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
