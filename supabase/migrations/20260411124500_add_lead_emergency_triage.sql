alter table public.leads
  add column if not exists lead_urgency text not null default 'scheduled',
  add column if not exists response_due_at timestamptz,
  add column if not exists triage_problem text,
  add column if not exists triage_site_risk text,
  add column if not exists triage_safety_risk boolean not null default false;

alter table public.leads
  drop constraint if exists leads_lead_urgency_check;

alter table public.leads
  add constraint leads_lead_urgency_check
  check (lead_urgency in ('emergency', 'same_day', 'scheduled', 'quote'));

update public.leads
set lead_urgency = case
    when lower(coalesce(job_type, '') || ' ' || coalesce(notes, '')) similar to
      '%(emergency|burst|flood|leak|no heat|no heating|no cooling|heatwave|gas|sparking|smoke|switchboard|power out)%'
      then 'emergency'
    when lower(coalesce(job_type, '') || ' ' || coalesce(notes, '')) similar to
      '%(blocked|fault|repair|not working|broken|after hours|today|urgent)%'
      then 'same_day'
    when lower(coalesce(job_type, '') || ' ' || coalesce(notes, '')) similar to
      '%(quote|install|installation|replace|upgrade)%'
      then 'quote'
    else 'scheduled'
  end
where lead_urgency is null
  or lead_urgency = 'scheduled';

update public.leads
set response_due_at = coalesce(created_at, now()) + case lead_urgency
    when 'emergency' then interval '15 minutes'
    when 'same_day' then interval '60 minutes'
    when 'quote' then interval '24 hours'
    else interval '4 hours'
  end
where response_due_at is null;

create index if not exists leads_business_urgency_due_idx
  on public.leads (business_id, lead_urgency, response_due_at);

comment on column public.leads.lead_urgency is
  'Emergency triage lane used to sort urgent HVAC, plumbing, and electrical leads.';

comment on column public.leads.response_due_at is
  'Operator response SLA target derived from lead urgency and intake time.';

comment on column public.leads.triage_problem is
  'Short customer-described failure mode for dispatch triage.';

comment on column public.leads.triage_site_risk is
  'Site access, occupant, property, or safety context captured before dispatch.';

comment on column public.leads.triage_safety_risk is
  'True when the lead reports possible safety-sensitive conditions.';
