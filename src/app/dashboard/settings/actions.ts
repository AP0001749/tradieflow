'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { normalizeBookingUrlSlug } from '@/lib/booking';
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
  };

  if (existing?.id) {
    const { error } = await supabase
      .from('business_profile')
      .update(payload)
      .eq('id', existing.id);

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
