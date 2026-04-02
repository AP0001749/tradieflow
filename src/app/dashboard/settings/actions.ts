'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { normalizeBookingUrlSlug } from '@/lib/booking';
import {
  DEFAULT_MISSED_CALL_TEXT_TEMPLATE,
  DEFAULT_QUOTE_FOLLOWUP_TEMPLATE,
  DEFAULT_REVIEW_REQUEST_TEMPLATE,
  coerceAutomationTemplate,
} from '@/lib/zero-leak';
import { revalidatePath } from 'next/cache';

async function generateAvailableBookingSlug(
  preferredValue: string,
  profileIdToIgnore?: string
) {
  const supabaseAdmin = createAdminClient();
  const normalizedBase = normalizeBookingUrlSlug(preferredValue);

  if (!normalizedBase) {
    throw new Error('Booking URL slug is required');
  }

  for (let attempt = 0; attempt < 25; attempt += 1) {
    const candidate =
      attempt === 0 ? normalizedBase : `${normalizedBase}-${attempt + 1}`;

    let query = supabaseAdmin
      .from('business_profile')
      .select('id')
      .eq('booking_url_slug', candidate)
      .limit(1);

    if (profileIdToIgnore) {
      query = query.neq('id', profileIdToIgnore);
    }

    const { data: existing, error } = await query.maybeSingle();
    if (error) {
      throw error;
    }

    if (!existing) {
      return candidate;
    }
  }

  throw new Error('Could not generate a unique booking URL slug');
}

export async function getBusinessProfile() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('business_profile')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function updateBusinessProfile(formData: {
  business_name: string;
  reply_to_email: string;
  google_review_url?: string;
  service_area_postcodes?: string[];
  default_job_types?: string[];
  booking_url_slug?: string;
  missed_call_text_enabled?: boolean;
  missed_call_text_template?: string;
  quote_followup_enabled?: boolean;
  quote_followup_delay_hours?: number;
  quote_followup_template?: string;
  review_request_enabled?: boolean;
  review_request_delay_hours?: number;
  review_request_template?: string;
}) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: existing, error: existingError } = await supabase
    .from('business_profile')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  const bookingUrlSlug = await generateAvailableBookingSlug(
    formData.booking_url_slug || formData.business_name,
    existing?.id
  );

  const payload = {
    business_name: formData.business_name,
    reply_to_email: formData.reply_to_email,
    google_review_url: formData.google_review_url || null,
    service_area_postcodes: formData.service_area_postcodes || [],
    default_job_types: formData.default_job_types || [],
    booking_url_slug: bookingUrlSlug,
    missed_call_text_enabled: Boolean(formData.missed_call_text_enabled),
    missed_call_text_template: coerceAutomationTemplate(
      formData.missed_call_text_template,
      DEFAULT_MISSED_CALL_TEXT_TEMPLATE
    ),
    quote_followup_enabled: Boolean(formData.quote_followup_enabled),
    quote_followup_delay_hours: Math.max(1, Math.round(formData.quote_followup_delay_hours || 48)),
    quote_followup_template: coerceAutomationTemplate(
      formData.quote_followup_template,
      DEFAULT_QUOTE_FOLLOWUP_TEMPLATE
    ),
    review_request_enabled: Boolean(formData.review_request_enabled),
    review_request_delay_hours: Math.max(1, Math.round(formData.review_request_delay_hours || 24)),
    review_request_template: coerceAutomationTemplate(
      formData.review_request_template,
      DEFAULT_REVIEW_REQUEST_TEMPLATE
    ),
  };

  if (existing?.id) {
    const { error } = await supabase
      .from('business_profile')
      .update(payload)
      .eq('id', existing.id)
      .eq('user_id', user.id);

    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('business_profile')
      .insert({
        user_id: user.id,
        ...payload,
      });

    if (error) throw error;
  }

  revalidatePath('/dashboard/settings');
  revalidatePath('/dashboard/leads');
}
