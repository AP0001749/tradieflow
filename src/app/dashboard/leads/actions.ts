'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import {
  inferDispatchPriorityFromJobType,
  inferServiceWindowFromLeadPreference,
} from '@/lib/job-dispatch';
import {
  LEAD_URGENCY_VALUES,
  buildLeadResponseDueAt,
  compareLeadResponsePriority,
  mapLeadUrgencyToDispatchPriority,
} from '@/lib/lead-triage';
import { inferTradeVerticalFromJobType } from '@/lib/trade-jobs';

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type LatestMissedCallTextback = {
  lead_id: string;
  status: string;
  sent_at: string | null;
  updated_at: string | null;
  last_error: string | null;
};

type RecentLeadEvent = {
  id: string;
  lead_id: string;
  created_at: string | null;
  event_type: string;
  meta: unknown;
};

function getProfileSlaMinutes(profile: {
  emergency_response_sla_minutes?: number | null;
  same_day_response_sla_minutes?: number | null;
  scheduled_response_sla_minutes?: number | null;
  quote_response_sla_minutes?: number | null;
}) {
  return {
    emergency: profile.emergency_response_sla_minutes,
    same_day: profile.same_day_response_sla_minutes,
    scheduled: profile.scheduled_response_sla_minutes,
    quote: profile.quote_response_sla_minutes,
  };
}

type RecoverableTableError = {
  code?: string;
  message?: string;
};

function isMissingMissedCallTextbackTable(error: RecoverableTableError | null) {
  if (!error) {
    return false;
  }

  const message = error.message || '';
  return (
    error.code === '42P01' ||
    error.code === 'PGRST205' ||
    (message.includes('twilio_missed_call_textbacks') &&
      (/schema cache/i.test(message) || /does not exist/i.test(message)))
  );
}

async function loadLatestMissedCallTextbacks(
  supabase: SupabaseServerClient,
  businessId: string,
  leadIds: string[],
) {
  if (leadIds.length === 0) {
    return new Map<string, LatestMissedCallTextback>();
  }

  const { data: textbacks, error: textbackError } = await supabase
    .from('twilio_missed_call_textbacks')
    .select('lead_id, status, sent_at, updated_at, last_error')
    .eq('business_id', businessId)
    .in('lead_id', leadIds)
    .order('created_at', { ascending: false });

  if (textbackError) {
    if (isMissingMissedCallTextbackTable(textbackError)) {
      return new Map<string, LatestMissedCallTextback>();
    }

    throw textbackError;
  }

  const latestTextbackByLeadId = new Map<string, LatestMissedCallTextback>();
  for (const textback of textbacks || []) {
    if (!latestTextbackByLeadId.has(textback.lead_id)) {
      latestTextbackByLeadId.set(textback.lead_id, textback);
    }
  }

  return latestTextbackByLeadId;
}

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
  const leads = data || [];
  const leadIds = leads.map((lead) => lead.id);

  if (leadIds.length === 0) {
    return leads;
  }

  const latestTextbackByLeadId = await loadLatestMissedCallTextbacks(
    supabase,
    profile.id,
    leadIds,
  );

  return leads.map((lead) => ({
    ...lead,
    latest_missed_call_textback: latestTextbackByLeadId.get(lead.id) || null,
  })).sort(compareLeadResponsePriority);
}

export async function getLeadById(leadId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: profile, error: profileError } = await supabase
    .from('business_profile')
    .select('id, emergency_response_sla_minutes, same_day_response_sla_minutes, scheduled_response_sla_minutes, quote_response_sla_minutes')
    .eq('user_id', user.id)
    .single();

  if (profileError && profileError.code !== 'PGRST116') throw profileError;
  if (!profile) {
    return null;
  }

  const { data: lead, error } = await supabase
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .eq('business_id', profile.id)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') throw error;
  if (!lead) {
    return null;
  }

  const latestTextbackByLeadId = await loadLatestMissedCallTextbacks(
    supabase,
    profile.id,
    [lead.id],
  );

  const { data: createdEvent, error: createdEventError } = await supabase
    .from('lead_events')
    .select('meta')
    .eq('lead_id', lead.id)
    .eq('event_type', 'created')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (createdEventError && createdEventError.code !== 'PGRST116') {
    throw createdEventError;
  }

  return {
    ...lead,
    created_event_meta: createdEvent?.meta || null,
    latest_missed_call_textback: latestTextbackByLeadId.get(lead.id) || null,
  };
}

export async function getRecentLeadEvents(leadIds: string[]) {
  if (leadIds.length === 0) {
    return [];
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('lead_events')
    .select('id, lead_id, created_at, event_type, meta')
    .in('lead_id', leadIds)
    .order('created_at', { ascending: false })
    .limit(12);

  if (error) throw error;

  return (data || []) as RecentLeadEvent[];
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

  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('id, first_responded_at')
    .eq('id', leadId)
    .eq('business_id', profile.id)
    .maybeSingle();

  if (leadError && leadError.code !== 'PGRST116') throw leadError;
  if (!lead) throw new Error('Lead not found');

  const updatePayload: {
    status: string;
    last_contacted_at?: string;
    first_responded_at?: string;
  } = { status };

  if (['contacted', 'booked', 'won'].includes(status)) {
    const contactedAt = new Date().toISOString();
    updatePayload.last_contacted_at = contactedAt;

    if (!lead.first_responded_at) {
      updatePayload.first_responded_at = contactedAt;
    }
  }

  const { data: updated, error } = await supabase
    .from('leads')
    .update(updatePayload)
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
  revalidatePath(`/dashboard/leads/${leadId}`);
}

export async function recordLeadResponse(
  leadId: string,
  channel: 'call' | 'sms' | 'email',
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  if (!['call', 'sms', 'email'].includes(channel)) {
    throw new Error('Invalid response channel');
  }

  const { data: profile, error: profileError } = await supabase
    .from('business_profile')
    .select('id, emergency_response_sla_minutes, same_day_response_sla_minutes, scheduled_response_sla_minutes, quote_response_sla_minutes')
    .eq('user_id', user.id)
    .single();

  if (profileError && profileError.code !== 'PGRST116') throw profileError;
  if (!profile) throw new Error('Business profile not found');

  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('id, status, first_responded_at')
    .eq('id', leadId)
    .eq('business_id', profile.id)
    .maybeSingle();

  if (leadError && leadError.code !== 'PGRST116') throw leadError;
  if (!lead) throw new Error('Lead not found');

  const contactedAt = new Date().toISOString();
  const nextStatus = lead.status === 'new' ? 'contacted' : lead.status;

  const { data: updated, error: updateError } = await supabase
    .from('leads')
    .update({
      status: nextStatus,
      last_contacted_at: contactedAt,
      first_responded_at: lead.first_responded_at || contactedAt,
    })
    .eq('id', leadId)
    .eq('business_id', profile.id)
    .select('id');

  if (updateError) throw updateError;
  if (!updated || updated.length === 0) throw new Error('Lead not found');

  await supabase.from('lead_events').insert({
    lead_id: leadId,
    event_type: 'operator_response_started',
    meta: {
      channel,
      changed_by: user.id,
      contacted_at: contactedAt,
      previous_status: lead.status,
      next_status: nextStatus,
      source: 'operator',
    },
  });

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/leads');
  revalidatePath(`/dashboard/leads/${leadId}`);
}

export async function updateLeadTriage(leadId: string, formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const urgency = String(formData.get('lead_urgency') || '').trim();
  const triageProblem = String(formData.get('triage_problem') || '').trim();
  const triageSiteRisk = String(formData.get('triage_site_risk') || '').trim();
  const triageSafetyRisk = formData.get('triage_safety_risk') === 'on';

  if (!LEAD_URGENCY_VALUES.includes(urgency as (typeof LEAD_URGENCY_VALUES)[number])) {
    throw new Error('Invalid lead urgency');
  }

  if (triageProblem.length > 1000 || triageSiteRisk.length > 1000) {
    throw new Error('Triage notes must be 1000 characters or fewer');
  }

  const { data: profile, error: profileError } = await supabase
    .from('business_profile')
    .select('id, emergency_response_sla_minutes, same_day_response_sla_minutes, scheduled_response_sla_minutes, quote_response_sla_minutes')
    .eq('user_id', user.id)
    .single();

  if (profileError && profileError.code !== 'PGRST116') throw profileError;
  if (!profile) throw new Error('Business profile not found');

  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('id, created_at, lead_urgency, response_due_at, triage_problem, triage_site_risk, triage_safety_risk')
    .eq('id', leadId)
    .eq('business_id', profile.id)
    .maybeSingle();

  if (leadError && leadError.code !== 'PGRST116') throw leadError;
  if (!lead) throw new Error('Lead not found');

  // Keep SLA anchored to lead arrival (created_at), not edit time.
  const urgencyChanged = lead.lead_urgency !== urgency;
  const arrivalAt = lead.created_at ? new Date(lead.created_at) : new Date();
  const responseDueAt = urgencyChanged
    ? buildLeadResponseDueAt(
        arrivalAt,
        urgency,
        getProfileSlaMinutes(profile),
      )
    : lead.response_due_at;

  const { data: updated, error: updateError } = await supabase
    .from('leads')
    .update({
      lead_urgency: urgency,
      response_due_at: responseDueAt,
      triage_problem: triageProblem || null,
      triage_site_risk: triageSiteRisk || null,
      triage_safety_risk: triageSafetyRisk,
    })
    .eq('id', leadId)
    .eq('business_id', profile.id)
    .select('id');

  if (updateError) throw updateError;
  if (!updated || updated.length === 0) throw new Error('Lead not found');

  await supabase.from('lead_events').insert({
    lead_id: leadId,
    event_type: 'triage_updated',
    meta: {
      changed_by: user.id,
      previous: {
        lead_urgency: lead.lead_urgency,
        response_due_at: lead.response_due_at,
        triage_problem: lead.triage_problem,
        triage_site_risk: lead.triage_site_risk,
        triage_safety_risk: lead.triage_safety_risk,
      },
      next: {
        lead_urgency: urgency,
        response_due_at: responseDueAt,
        triage_problem: triageProblem || null,
        triage_site_risk: triageSiteRisk || null,
        triage_safety_risk: triageSafetyRisk,
      },
      source: 'operator',
    },
  });

  revalidatePath('/dashboard/leads');
  revalidatePath(`/dashboard/leads/${leadId}`);
}

export async function toggleLeadSmsDoNotContact(leadId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: profile, error: profileError } = await supabase
    .from('business_profile')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (profileError && profileError.code !== 'PGRST116') throw profileError;
  if (!profile) throw new Error('Business profile not found');

  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('id, sms_do_not_contact')
    .eq('id', leadId)
    .eq('business_id', profile.id)
    .maybeSingle();

  if (leadError && leadError.code !== 'PGRST116') throw leadError;
  if (!lead) throw new Error('Lead not found');

  const nextDoNotContact = !lead.sms_do_not_contact;

  const { data: updated, error: updateError } = await supabase
    .from('leads')
    .update({
      sms_do_not_contact: nextDoNotContact,
      sms_do_not_contact_reason: nextDoNotContact ? 'manual_operator_pause' : null,
    })
    .eq('id', leadId)
    .eq('business_id', profile.id)
    .select('id');

  if (updateError) throw updateError;
  if (!updated || updated.length === 0) throw new Error('Lead not found');

  await supabase.from('lead_events').insert({
    lead_id: leadId,
    event_type: 'sms_preference_changed',
    meta: {
      changed_by: user.id,
      sms_do_not_contact: nextDoNotContact,
      source: 'operator',
    },
  });

  revalidatePath('/dashboard/leads');
  revalidatePath(`/dashboard/leads/${leadId}`);
}

export async function toggleLeadFollowupQueue(leadId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: profile, error: profileError } = await supabase
    .from('business_profile')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (profileError && profileError.code !== 'PGRST116') throw profileError;
  if (!profile) throw new Error('Business profile not found');

  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select(
      'id, status, email, followup_step, next_followup_at, converted_job_id'
    )
    .eq('id', leadId)
    .eq('business_id', profile.id)
    .maybeSingle();

  if (leadError && leadError.code !== 'PGRST116') throw leadError;
  if (!lead) throw new Error('Lead not found');
  if (!lead.email) throw new Error('Lead needs an email address before follow-up can run');
  if (lead.converted_job_id) throw new Error('Converted leads cannot be queued for nurture');
  if (!['new', 'contacted'].includes(lead.status)) {
    throw new Error('Only active leads can be paused or queued for nurture');
  }
  if (![0, 1, 2].includes(lead.followup_step ?? -1)) {
    throw new Error('This lead is not in an active follow-up step');
  }

  const nextFollowupAt = lead.next_followup_at ? null : new Date().toISOString();

  const { data: updated, error: updateError } = await supabase
    .from('leads')
    .update({
      next_followup_at: nextFollowupAt,
      processing: false,
      processing_started_at: null,
    })
    .eq('id', leadId)
    .eq('business_id', profile.id)
    .select('id');

  if (updateError) throw updateError;
  if (!updated || updated.length === 0) throw new Error('Lead not found');

  await supabase.from('lead_events').insert({
    lead_id: leadId,
    event_type: 'followup_queue_changed',
    meta: {
      active: Boolean(nextFollowupAt),
      changed_by: user.id,
      followup_step: lead.followup_step,
      next_followup_at: nextFollowupAt,
      source: 'operator',
    },
  });

  revalidatePath('/dashboard/leads');
  revalidatePath(`/dashboard/leads/${leadId}`);
}

export async function restartLeadFollowup(leadId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: profile, error: profileError } = await supabase
    .from('business_profile')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (profileError && profileError.code !== 'PGRST116') throw profileError;
  if (!profile) throw new Error('Business profile not found');

  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('id, status, email, converted_job_id')
    .eq('id', leadId)
    .eq('business_id', profile.id)
    .maybeSingle();

  if (leadError && leadError.code !== 'PGRST116') throw leadError;
  if (!lead) throw new Error('Lead not found');
  if (!lead.email) throw new Error('Lead needs an email address before follow-up can restart');
  if (lead.converted_job_id) throw new Error('Converted leads cannot restart nurture');
  if (!['stale', 'lost'].includes(lead.status)) {
    throw new Error('Only stale or lost leads can restart nurture');
  }

  const nextFollowupAt = new Date().toISOString();

  const { data: updated, error: updateError } = await supabase
    .from('leads')
    .update({
      status: 'contacted',
      followup_step: 0,
      next_followup_at: nextFollowupAt,
      processing: false,
      processing_started_at: null,
    })
    .eq('id', leadId)
    .eq('business_id', profile.id)
    .select('id');

  if (updateError) throw updateError;
  if (!updated || updated.length === 0) throw new Error('Lead not found');

  await supabase.from('lead_events').insert({
    lead_id: leadId,
    event_type: 'followup_restarted',
    meta: {
      changed_by: user.id,
      next_followup_at: nextFollowupAt,
      previous_status: lead.status,
      source: 'operator',
    },
  });

  revalidatePath('/dashboard/leads');
  revalidatePath(`/dashboard/leads/${leadId}`);
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

  // Idempotent: repeated conversion returns the existing job.
  if (lead.converted_job_id) {
    revalidatePath('/dashboard/leads');
    revalidatePath(`/dashboard/leads/${leadId}`);
    revalidatePath('/dashboard/jobs');
    return lead.converted_job_id;
  }

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
  const triageDescription = [
    lead.notes,
    lead.triage_problem ? `Triage problem: ${lead.triage_problem}` : null,
    lead.triage_site_risk ? `Site/risk context: ${lead.triage_site_risk}` : null,
    lead.triage_safety_risk ? 'Safety-sensitive triage flag: yes' : null,
    lead.response_due_at ? `Lead response SLA: ${lead.response_due_at}` : null,
  ]
    .filter(Boolean)
    .join('\n\n') || null;
  const { data: job, error: jobError } = await supabase.rpc('create_job_with_limit', {
    p_client_id: clientId,
    p_title: jobTitle,
    p_status: 'scheduled',
    p_price: null,
    p_start_date: lead.preferred_date,
    p_description: triageDescription,
    p_trade_vertical: inferTradeVerticalFromJobType(lead.job_type),
    p_dispatch_priority:
      lead.lead_urgency
        ? mapLeadUrgencyToDispatchPriority(lead.lead_urgency)
        : inferDispatchPriorityFromJobType(lead.job_type),
    p_service_window: inferServiceWindowFromLeadPreference(lead.preferred_time_window),
  });

  if (jobError || !job) throw new Error(jobError?.message || 'Failed to create job');

  // Claim conversion only if still unconverted (guards concurrent double-submit).
  const { data: updatedLeadRows, error: leadUpdateError } = await supabase
    .from('leads')
    .update({
      status: 'won',
      converted_job_id: job.id,
    })
    .eq('id', leadId)
    .eq('business_id', profile.id)
    .is('converted_job_id', null)
    .select('id');

  if (leadUpdateError) {
    throw new Error(leadUpdateError.message || 'Failed to finalize lead conversion');
  }

  if (!updatedLeadRows || updatedLeadRows.length === 0) {
    const { data: existingLead } = await supabase
      .from('leads')
      .select('converted_job_id')
      .eq('id', leadId)
      .eq('business_id', profile.id)
      .maybeSingle();

    // Best-effort cleanup of the duplicate job created by the losing request.
    await supabase.from('jobs').delete().eq('id', job.id).eq('user_id', user.id);

    if (existingLead?.converted_job_id) {
      revalidatePath('/dashboard/leads');
      revalidatePath(`/dashboard/leads/${leadId}`);
      revalidatePath('/dashboard/jobs');
      return existingLead.converted_job_id;
    }

    throw new Error('Lead conversion raced and no converted job was found');
  }

  // Log event
  await supabase.from('lead_events').insert({
    lead_id: leadId,
    event_type: 'converted',
    meta: { job_id: job.id, client_id: clientId },
  });

  revalidatePath('/dashboard/leads');
  revalidatePath(`/dashboard/leads/${leadId}`);
  revalidatePath('/dashboard/jobs');
  revalidatePath('/dashboard/clients');
  revalidatePath('/dashboard');
  
  return job.id;
}
