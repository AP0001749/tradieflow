'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getLeads() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Get business profile
  const { data: profile } = await supabase
    .from('business_profile')
    .select('id')
    .eq('user_id', user.id)
    .single();

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

  const { error } = await supabase
    .from('leads')
    .update({ status })
    .eq('id', leadId);

  if (error) throw error;

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

  // Get lead details
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .single();

  if (leadError || !lead) throw new Error('Lead not found');

  // Check if client exists (by email or phone)
  let clientId: string;
  const { data: existingClient } = await supabase
    .from('clients')
    .select('id')
    .eq('user_id', user.id)
    .or(`email.eq.${lead.email},phone.eq.${lead.phone}`)
    .limit(1)
    .single();

  if (existingClient) {
    clientId = existingClient.id;
  } else {
    // Create new client
    const { data: newClient, error: clientError } = await supabase
      .from('clients')
      .insert({
        user_id: user.id,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        address: lead.suburb && lead.postcode ? `${lead.suburb} ${lead.postcode}` : null,
        notes: lead.notes,
      })
      .select()
      .single();

    if (clientError || !newClient) throw new Error('Failed to create client');
    clientId = newClient.id;
  }

  // Create job
  const jobTitle = `${lead.job_type?.replace('_', ' ')} - ${lead.suburb || 'Job'}`;
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .insert({
      user_id: user.id,
      client_id: clientId,
      title: jobTitle,
      description: lead.notes,
      date_scheduled: lead.preferred_date,
      status: 'scheduled',
    })
    .select()
    .single();

  if (jobError || !job) throw new Error('Failed to create job');

  // Update lead
  await supabase
    .from('leads')
    .update({
      status: 'won',
      converted_job_id: job.id,
    })
    .eq('id', leadId);

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
