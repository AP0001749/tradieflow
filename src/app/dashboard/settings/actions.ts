'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getBusinessProfile() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('business_profile')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // Ignore "not found" error
  return data;
}

export async function updateBusinessProfile(formData: {
  business_name: string;
  reply_to_email: string;
  google_review_url?: string;
  service_area_postcodes?: string[];
  default_job_types?: string[];
}) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Check if profile exists
  const { data: existing } = await supabase
    .from('business_profile')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (existing) {
    // Update
    const { error } = await supabase
      .from('business_profile')
      .update({
        business_name: formData.business_name,
        reply_to_email: formData.reply_to_email,
        google_review_url: formData.google_review_url || null,
        service_area_postcodes: formData.service_area_postcodes || [],
        default_job_types: formData.default_job_types || [],
      })
      .eq('id', existing.id);

    if (error) throw error;
  } else {
    // Claim an existing default profile (created by public lead capture) if present,
    // otherwise create a brand new profile for this user.
    const { data: defaultProfile } = await supabase
      .from('business_profile')
      .select('id')
      .is('user_id', null)
      .limit(1)
      .maybeSingle();

    if (defaultProfile?.id) {
      const { error } = await supabase
        .from('business_profile')
        .update({
          user_id: user.id,
          business_name: formData.business_name,
          reply_to_email: formData.reply_to_email,
          google_review_url: formData.google_review_url || null,
          service_area_postcodes: formData.service_area_postcodes || [],
          default_job_types: formData.default_job_types || [],
        })
        .eq('id', defaultProfile.id);

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('business_profile')
        .insert({
          user_id: user.id,
          business_name: formData.business_name,
          reply_to_email: formData.reply_to_email,
          google_review_url: formData.google_review_url || null,
          service_area_postcodes: formData.service_area_postcodes || [],
          default_job_types: formData.default_job_types || [],
        });

      if (error) throw error;
    }
  }

  revalidatePath('/dashboard/settings');
  revalidatePath('/dashboard/leads');
}
