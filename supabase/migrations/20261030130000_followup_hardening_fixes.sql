-- =============================================================
-- Follow-up hardening fixes
-- 1. Document lead_sms_tracking + business scoping
-- 2. Exclude cancelled/completed jobs from quote follow-up claims
-- =============================================================

-- -------------------------------------------------------------
-- 1. lead_sms_tracking (was used by missed-call debounce but never migrated)
-- -------------------------------------------------------------
create table if not exists public.lead_sms_tracking (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.business_profile (id) on delete cascade,
  phone_number text not null,
  sent_at timestamptz not null default now(),
  message_sid text,
  purpose text not null default 'missed_call_text_back'
);

comment on table public.lead_sms_tracking is
  'Outbound SMS debounce/audit log for missed-call and similar automations, scoped per business when business_id is present.';

comment on column public.lead_sms_tracking.business_id is
  'Owning business; debounce checks should filter by this to avoid cross-tenant suppression.';

comment on column public.lead_sms_tracking.phone_number is
  'Destination phone number the SMS was sent to.';

comment on column public.lead_sms_tracking.sent_at is
  'When the outbound SMS was recorded for debounce.';

comment on column public.lead_sms_tracking.message_sid is
  'Optional Twilio MessageSid for the outbound SMS.';

comment on column public.lead_sms_tracking.purpose is
  'Automation purpose label (e.g. missed_call_text_back).';

alter table public.lead_sms_tracking
  add column if not exists business_id uuid references public.business_profile (id) on delete cascade;

alter table public.lead_sms_tracking
  add column if not exists message_sid text;

alter table public.lead_sms_tracking
  add column if not exists purpose text;

update public.lead_sms_tracking
set purpose = 'missed_call_text_back'
where purpose is null;

alter table public.lead_sms_tracking
  alter column purpose set default 'missed_call_text_back';

alter table public.lead_sms_tracking
  alter column purpose set not null;

create index if not exists idx_lead_sms_tracking_phone_sent_at
  on public.lead_sms_tracking (phone_number, sent_at desc);

create index if not exists idx_lead_sms_tracking_business_phone_sent_at
  on public.lead_sms_tracking (business_id, phone_number, sent_at desc);

alter table public.lead_sms_tracking enable row level security;

revoke all on table public.lead_sms_tracking from anon, authenticated;
grant select, insert, update, delete on table public.lead_sms_tracking to service_role;

-- -------------------------------------------------------------
-- 2. Quote follow-ups must skip cancelled/completed jobs
-- -------------------------------------------------------------
drop function if exists public.claim_due_quote_followups(integer);

create function public.claim_due_quote_followups(
  limit_count integer default 50
)
returns table (
  job_id uuid,
  user_id uuid,
  job_title text,
  job_price numeric,
  quote_sent_at timestamptz,
  business_name text,
  reply_to_email text,
  quote_followup_template text,
  twilio_phone_number text,
  client_name text,
  client_email text,
  client_phone text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with candidate_ids as (
    select jobs.id
    from public.jobs as jobs
    inner join public.business_profile as business_profile
      on business_profile.user_id = jobs.user_id
    inner join public.profiles as profiles
      on profiles.user_id = jobs.user_id
    inner join public.clients as clients
      on clients.id = jobs.client_id
      and clients.user_id = jobs.user_id
    where business_profile.quote_followup_enabled = true
      and coalesce(profiles.subscription_plan_key, 'free') = 'apex'
      and coalesce(profiles.subscription_status, 'active') in ('active', 'trialing', 'past_due')
      and jobs.quote_sent_at is not null
      and jobs.quote_followup_sent_at is null
      and coalesce(jobs.status, '') not in ('cancelled', 'completed')
      and (
        coalesce(nullif(trim(clients.email), ''), '') <> ''
        or (
          coalesce(nullif(trim(clients.phone), ''), '') <> ''
          and coalesce(nullif(trim(business_profile.twilio_phone_number), ''), '') <> ''
        )
      )
      and jobs.quote_sent_at
        + (greatest(coalesce(business_profile.quote_followup_delay_hours, 48), 1)::text || ' hours')::interval
        <= now()
      and (
        jobs.quote_followup_processing = false
        or jobs.quote_followup_processing_started_at is null
        or jobs.quote_followup_processing_started_at <= now() - interval '15 minutes'
      )
    order by jobs.quote_sent_at asc, jobs.created_at asc
    limit greatest(coalesce(limit_count, 50), 1)
    for update of jobs skip locked
  ),
  claimed as (
    update public.jobs as jobs
    set quote_followup_processing = true,
        quote_followup_processing_started_at = now(),
        quote_followup_last_error = null
    where jobs.id in (select candidate_ids.id from candidate_ids)
      and coalesce(jobs.status, '') not in ('cancelled', 'completed')
    returning jobs.*
  )
  select
    claimed.id,
    claimed.user_id,
    claimed.title,
    claimed.price,
    claimed.quote_sent_at,
    business_profile.business_name,
    business_profile.reply_to_email,
    business_profile.quote_followup_template,
    business_profile.twilio_phone_number,
    clients.name,
    clients.email,
    clients.phone
  from claimed
  inner join public.business_profile as business_profile
    on business_profile.user_id = claimed.user_id
  inner join public.clients as clients
    on clients.id = claimed.client_id
    and clients.user_id = claimed.user_id;
end;
$$;

revoke all on function public.claim_due_quote_followups(integer) from public;
grant execute on function public.claim_due_quote_followups(integer) to service_role;

comment on function public.claim_due_quote_followups(integer) is
  'Claims due quote follow-ups for Apex businesses, excluding cancelled and completed jobs.';
