import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      email,
      phone,
      suburb,
      postcode,
      job_type,
      preferred_date,
      preferred_time_window,
      notes,
    } = body;

    // Validate required fields
    if (!name || !email || !phone || !suburb || !postcode || !job_type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create Supabase client without auth (anon)
    const supabase = await createClient();

    // Get the first business profile (for MVP, assuming single tenant per deployment)
    // In production, you'd use booking_url_slug or subdomain routing
    const { data: businessProfile, error: businessError } = await supabase
      .from('business_profile')
      .select('id')
      .limit(1)
      .single();

    if (businessError || !businessProfile) {
      // If no business exists yet, create a default one
      // This is a fallback for MVP - in production, this shouldn't happen
      console.error('No business profile found:', businessError);
      return NextResponse.json(
        { error: 'Service not available yet' },
        { status: 503 }
      );
    }

    // Insert lead
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .insert({
        business_id: businessProfile.id,
        source: 'book_page',
        status: 'new',
        name,
        email,
        phone,
        suburb,
        postcode,
        job_type,
        preferred_date: preferred_date || null,
        preferred_time_window: preferred_time_window || null,
        notes: notes || null,
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
