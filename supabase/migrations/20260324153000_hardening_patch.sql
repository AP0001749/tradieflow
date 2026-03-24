alter table public.business_profile
add column if not exists booking_url_slug text;

with slug_source as (
  select
    id,
    lower(
      trim(
        both '-' from regexp_replace(
          regexp_replace(
            coalesce(nullif(booking_url_slug, ''), nullif(business_name, ''), 'business'),
            '[^a-zA-Z0-9]+',
            '-',
            'g'
          ),
          '-+',
          '-',
          'g'
        )
      )
    ) as base_slug
  from public.business_profile
)
update public.business_profile as business_profile
set booking_url_slug = left(
  coalesce(nullif(slug_source.base_slug, ''), 'business') || '-' || substr(replace(business_profile.id::text, '-', ''), 1, 8),
  80
)
from slug_source
where business_profile.id = slug_source.id
  and coalesce(nullif(business_profile.booking_url_slug, ''), '') = '';

create unique index if not exists idx_business_profile_booking_url_slug
  on public.business_profile (booking_url_slug);

alter table public.business_profile
alter column booking_url_slug set not null;

alter table public.leads
add column if not exists processing boolean;

alter table public.leads
add column if not exists processing_started_at timestamptz;

update public.leads
set processing = false
where processing is null;

alter table public.leads
alter column processing set default false;

alter table public.leads
alter column processing set not null;

create table if not exists public.stripe_events (
  id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);

create index if not exists idx_leads_processing_due
  on public.leads (next_followup_at)
  where status in ('new', 'contacted');

drop function if exists public.claim_due_leads(integer);

create function public.claim_due_leads(limit_count integer default 50)
returns table (
  id uuid,
  business_id uuid,
  name text,
  email text,
  phone text,
  suburb text,
  job_type text,
  preferred_date text,
  preferred_time_window text,
  notes text,
  followup_step integer,
  status text,
  business_name text,
  reply_to_email text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with candidate_ids as (
    select leads.id
    from public.leads as leads
    where leads.status in ('new', 'contacted')
      and leads.followup_step in (0, 1, 2)
      and leads.next_followup_at <= now()
      and coalesce(leads.email, '') <> ''
      and (
        leads.processing = false
        or leads.processing_started_at is null
        or leads.processing_started_at <= now() - interval '15 minutes'
      )
    order by leads.next_followup_at asc, leads.created_at asc
    limit greatest(coalesce(limit_count, 50), 1)
    for update skip locked
  ),
  claimed as (
    update public.leads as leads
    set processing = true,
        processing_started_at = now()
    where leads.id in (select candidate_ids.id from candidate_ids)
    returning leads.*
  )
  select
    claimed.id,
    claimed.business_id,
    claimed.name,
    claimed.email,
    claimed.phone,
    claimed.suburb,
    claimed.job_type,
    claimed.preferred_date::text,
    claimed.preferred_time_window,
    claimed.notes,
    claimed.followup_step,
    claimed.status,
    business_profile.business_name,
    business_profile.reply_to_email
  from claimed
  inner join public.business_profile
    on business_profile.id = claimed.business_id;
end;
$$;

revoke all on function public.claim_due_leads(integer) from public;
grant execute on function public.claim_due_leads(integer) to service_role;

drop function if exists public.create_client_with_limit(text, text, text, text, text);

create function public.create_client_with_limit(
  p_name text,
  p_email text default null,
  p_phone text default null,
  p_address text default null,
  p_notes text default null
)
returns public.clients
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile record;
  v_client public.clients;
begin
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  perform pg_advisory_xact_lock(hashtext(v_user_id::text));

  select subscription_tier, subscription_status
  into v_profile
  from public.profiles
  where user_id = v_user_id
  limit 1;

  if not (
    coalesce(v_profile.subscription_tier, 'free') = 'pro'
    and coalesce(v_profile.subscription_status, 'active') in ('active', 'trialing', 'past_due')
  ) then
    if (
      select count(*)
      from public.clients
      where user_id = v_user_id
    ) >= 3 then
      raise exception 'Free plan limited to 3 clients. Upgrade to Pro for unlimited clients.';
    end if;
  end if;

  insert into public.clients (
    user_id,
    name,
    email,
    phone,
    address,
    notes
  )
  values (
    v_user_id,
    p_name,
    nullif(p_email, ''),
    nullif(p_phone, ''),
    nullif(p_address, ''),
    nullif(p_notes, '')
  )
  returning * into v_client;

  return v_client;
end;
$$;

revoke all on function public.create_client_with_limit(text, text, text, text, text) from public;
grant execute on function public.create_client_with_limit(text, text, text, text, text) to authenticated;

drop function if exists public.create_job_with_limit(uuid, text, text, numeric, date, text);

create function public.create_job_with_limit(
  p_client_id uuid,
  p_title text,
  p_status text default 'draft',
  p_price numeric default null,
  p_start_date date default null,
  p_description text default null
)
returns public.jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile record;
  v_job public.jobs;
begin
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  perform pg_advisory_xact_lock(hashtext(v_user_id::text));

  if not exists (
    select 1
    from public.clients
    where id = p_client_id
      and user_id = v_user_id
  ) then
    raise exception 'Invalid client selected';
  end if;

  select subscription_tier, subscription_status
  into v_profile
  from public.profiles
  where user_id = v_user_id
  limit 1;

  if not (
    coalesce(v_profile.subscription_tier, 'free') = 'pro'
    and coalesce(v_profile.subscription_status, 'active') in ('active', 'trialing', 'past_due')
  ) then
    if (
      select count(*)
      from public.jobs
      where user_id = v_user_id
    ) >= 5 then
      raise exception 'Free plan limited to 5 jobs. Upgrade to Pro for unlimited jobs.';
    end if;
  end if;

  insert into public.jobs (
    user_id,
    client_id,
    title,
    status,
    price,
    start_date,
    description
  )
  values (
    v_user_id,
    p_client_id,
    p_title,
    p_status,
    p_price,
    p_start_date,
    nullif(p_description, '')
  )
  returning * into v_job;

  return v_job;
end;
$$;

revoke all on function public.create_job_with_limit(uuid, text, text, numeric, date, text) from public;
grant execute on function public.create_job_with_limit(uuid, text, text, numeric, date, text) to authenticated;

drop function if exists public.create_invoice_with_limit(uuid, numeric, date, text);

create function public.create_invoice_with_limit(
  p_job_id uuid,
  p_amount numeric,
  p_due_date date,
  p_notes text default null
)
returns public.invoices
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile record;
  v_invoice public.invoices;
begin
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  perform pg_advisory_xact_lock(hashtext(v_user_id::text));

  if not exists (
    select 1
    from public.jobs
    where id = p_job_id
      and user_id = v_user_id
  ) then
    raise exception 'Invalid job selected';
  end if;

  select subscription_tier, subscription_status
  into v_profile
  from public.profiles
  where user_id = v_user_id
  limit 1;

  if not (
    coalesce(v_profile.subscription_tier, 'free') = 'pro'
    and coalesce(v_profile.subscription_status, 'active') in ('active', 'trialing', 'past_due')
  ) then
    if (
      select count(*)
      from public.invoices
      where user_id = v_user_id
    ) >= 10 then
      raise exception 'Free plan limited to 10 invoices. Upgrade to Pro for unlimited invoices.';
    end if;
  end if;

  if exists (
    select 1
    from public.invoices
    where user_id = v_user_id
      and job_id = p_job_id
  ) then
    raise exception 'This job already has an invoice';
  end if;

  insert into public.invoices (
    user_id,
    job_id,
    amount,
    due_date,
    status,
    notes
  )
  values (
    v_user_id,
    p_job_id,
    p_amount,
    p_due_date,
    'unpaid',
    nullif(p_notes, '')
  )
  returning * into v_invoice;

  return v_invoice;
end;
$$;

revoke all on function public.create_invoice_with_limit(uuid, numeric, date, text) from public;
grant execute on function public.create_invoice_with_limit(uuid, numeric, date, text) to authenticated;
