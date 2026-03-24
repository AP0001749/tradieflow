'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getLeads() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Get business profile
  const { data: profile, error: profileError } = await supabase
    .from('business_profile')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (profileError && profileError.code !== 'PGRST116') throw profileError;
  if (!profile) {
    return [];
  }

  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('business_id', profile.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function updateLeadStatus(leadId: string, status: string) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Validate status value
  const validStatuses = ['new', 'contacted', 'booked', 'won', 'lost', 'stale'];
  if (!validStatuses.includes(status)) {
    throw new Error('Invalid status');
  }

  // Verify the lead belongs to the user's business
  const { data: profile, error: profileError } = await supabase
    .from('business_profile')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (profileError && profileError.code !== 'PGRST116') throw profileError;
  if (!profile) throw new Error('Business profile not found');

  const { data: updated, error } = await supabase
    .from('leads')
    .update({ status })
    .eq('id', leadId)
    .eq('business_id', profile.id)
    .select('id');

  if (error) throw error;
  if (!updated || updated.length === 0) throw new Error('Lead not found');

  // Log event
  await supabase.from('lead_events').insert({
    lead_id: leadId,
    event_type: 'status_changed',
    meta: { new_status: status, changed_by: user.id },
  });

  revalidatePath('/dashboard/leads');
}

export async function convertLeadToJob(leadId: string) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Verify the lead belongs to the user's business
  const { data: profile, error: profileError } = await supabase
    .from('business_profile')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (profileError && profileError.code !== 'PGRST116') throw profileError;
  if (!profile) throw new Error('Business profile not found');

  // Get lead details (scoped to user's business)
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .eq('business_id', profile.id)
    .single();

  if (leadError || !lead) throw new Error('Lead not found');

  // Check if client exists (by email or phone)
  // Use separate .eq() queries instead of .or() to avoid PostgREST filter injection
  let clientId: string;
  let existingClient: { id: string } | null = null;
  if (lead.email) {
    const { data } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', user.id)
      .eq('email', lead.email)
      .limit(1)
      .maybeSingle();
    existingClient = data;
  }
  if (!existingClient && lead.phone) {
    const { data } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', user.id)
      .eq('phone', lead.phone)
      .limit(1)
      .maybeSingle();
    existingClient = data;
  }

  if (existingClient) {
    clientId = existingClient.id;
  } else {
    const { data: newClient, error: clientError } = await supabase.rpc(
      'create_client_with_limit',
      {
        p_name: lead.name,
        p_email: lead.email,
        p_phone: lead.phone,
        p_address: lead.suburb && lead.postcode ? `${lead.suburb} ${lead.postcode}` : null,
        p_notes: lead.notes,
      }
    );

    if (clientError || !newClient) {
      throw new Error(clientError?.message || 'Failed to create client');
    }
    clientId = newClient.id;
  }

  const jobTitle = `${lead.job_type?.replaceAll('_', ' ') || 'Job'} - ${lead.suburb || 'Job'}`;
  const { data: job, error: jobError } = await supabase.rpc('create_job_with_limit', {
    p_client_id: clientId,
    p_title: jobTitle,
    p_status: 'scheduled',
    p_price: null,
    p_start_date: lead.preferred_date,
    p_description: lead.notes,
  });

  if (jobError || !job) throw new Error(jobError?.message || 'Failed to create job');

  // Update lead
  const { error: leadUpdateError } = await supabase
    .from('leads')
    .update({
      status: 'won',
      converted_job_id: job.id,
    })
    .eq('id', leadId);

  if (leadUpdateError) {
    console.warn('Failed to update lead status after conversion:', leadUpdateError);
  }

  // Log event
  await supabase.from('lead_events').insert({
    lead_id: leadId,
    event_type: 'converted',
    meta: { job_id: job.id, client_id: clientId },
  });

  revalidatePath('/dashboard/leads');
  revalidatePath('/dashboard/jobs');
  revalidatePath('/dashboard/clients');
  
  return job.id;
}
