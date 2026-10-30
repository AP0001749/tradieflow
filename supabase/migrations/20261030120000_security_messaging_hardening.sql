-- =============================================================
-- Security + messaging hardening
-- 1. Protect profiles billing columns from client updates
-- 2. Unique normalised Twilio numbers
-- 3. Business+phone SMS suppression registry
-- 4. Exclusive DLQ claim helper
-- 5. Restrict SECURITY DEFINER cron helpers
-- 6. Schedule zero-leak cron
-- 7. Public invoice share tokens
-- =============================================================

-- -------------------------------------------------------------
-- 1. Profiles billing protection
-- -------------------------------------------------------------
create or replace function public.protect_profiles_billing_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.stripe_customer_id is distinct from old.stripe_customer_id
      or new.stripe_subscription_id is distinct from old.stripe_subscription_id
      or new.subscription_tier is distinct from old.subscription_tier
      or new.subscription_status is distinct from old.subscription_status
      or new.subscription_start_date is distinct from old.subscription_start_date
      or new.subscription_end_date is distinct from old.subscription_end_date
      or new.subscription_plan_key is distinct from old.subscription_plan_key then
      raise exception 'Billing and subscription fields can only be updated by trusted server operations';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protect_profiles_billing_columns on public.profiles;
create trigger trg_protect_profiles_billing_columns
  before update on public.profiles
  for each row
  execute function public.protect_profiles_billing_columns();

revoke update (
  stripe_customer_id,
  stripe_subscription_id,
  subscription_tier,
  subscription_status,
  subscription_start_date,
  subscription_end_date,
  subscription_plan_key
) on public.profiles from anon, authenticated;

grant update (
  stripe_customer_id,
  stripe_subscription_id,
  subscription_tier,
  subscription_status,
  subscription_start_date,
  subscription_end_date,
  subscription_plan_key
) on public.profiles to service_role;

comment on function public.protect_profiles_billing_columns() is
  'Blocks client-role updates to Stripe and subscription columns on profiles.';

-- -------------------------------------------------------------
-- 2. Unique normalised Twilio phone numbers
-- -------------------------------------------------------------
create or replace function public.normalize_phone_digits(value text)
returns text
language sql
immutable
as $$
  select nullif(regexp_replace(coalesce(value, ''), '\D', '', 'g'), '');
$$;

create unique index if not exists idx_business_profile_twilio_phone_digits_unique
  on public.business_profile (public.normalize_phone_digits(twilio_phone_number))
  where twilio_phone_number is not null
    and public.normalize_phone_digits(twilio_phone_number) is not null;

-- -------------------------------------------------------------
-- 3. Business + phone SMS suppression registry
-- -------------------------------------------------------------
create table if not exists public.sms_suppressions (
  business_id uuid not null references public.business_profile(id) on delete cascade,
  phone_digits text not null,
  reason text,
  source text,
  lead_id uuid references public.leads(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (business_id, phone_digits),
  constraint sms_suppressions_phone_digits_check check (length(phone_digits) >= 8)
);

create index if not exists idx_sms_suppressions_phone_digits
  on public.sms_suppressions (phone_digits);

alter table public.sms_suppressions enable row level security;

drop policy if exists sms_suppressions_owner_select on public.sms_suppressions;
create policy sms_suppressions_owner_select
  on public.sms_suppressions
  for select
  using (
    exists (
      select 1
      from public.business_profile bp
      where bp.id = sms_suppressions.business_id
        and bp.user_id = auth.uid()
    )
  );

revoke all on table public.sms_suppressions from public;
grant select on table public.sms_suppressions to authenticated;
grant select, insert, update, delete on table public.sms_suppressions to service_role;

create or replace function public.upsert_sms_suppression(
  p_business_id uuid,
  p_phone text,
  p_reason text default null,
  p_source text default null,
  p_lead_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_digits text := public.normalize_phone_digits(p_phone);
begin
  if p_business_id is null or v_digits is null or length(v_digits) < 8 then
    return;
  end if;

  insert into public.sms_suppressions (
    business_id,
    phone_digits,
    reason,
    source,
    lead_id,
    updated_at
  )
  values (
    p_business_id,
    v_digits,
    nullif(trim(coalesce(p_reason, '')), ''),
    nullif(trim(coalesce(p_source, '')), ''),
    p_lead_id,
    now()
  )
  on conflict (business_id, phone_digits) do update
  set
    reason = coalesce(excluded.reason, public.sms_suppressions.reason),
    source = coalesce(excluded.source, public.sms_suppressions.source),
    lead_id = coalesce(excluded.lead_id, public.sms_suppressions.lead_id),
    updated_at = now();
end;
$$;

create or replace function public.is_sms_suppressed(
  p_business_id uuid,
  p_phone text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_digits text := public.normalize_phone_digits(p_phone);
  v_exists boolean := false;
begin
  if p_business_id is null or v_digits is null then
    return false;
  end if;

  select exists (
    select 1
    from public.sms_suppressions
    where business_id = p_business_id
      and (
        phone_digits = v_digits
        or phone_digits = right(v_digits, 9)
        or right(phone_digits, 9) = right(v_digits, 9)
      )
  )
  into v_exists;

  return coalesce(v_exists, false);
end;
$$;

revoke all on function public.upsert_sms_suppression(uuid, text, text, text, uuid) from public;
revoke all on function public.is_sms_suppressed(uuid, text) from public;
grant execute on function public.upsert_sms_suppression(uuid, text, text, text, uuid) to service_role;
grant execute on function public.is_sms_suppressed(uuid, text) to service_role;

-- Backfill from existing opted-out leads
insert into public.sms_suppressions (business_id, phone_digits, reason, source, lead_id)
select
  l.business_id,
  public.normalize_phone_digits(l.phone),
  coalesce(l.sms_do_not_contact_reason, 'legacy_lead_opt_out'),
  'backfill_leads',
  l.id
from public.leads l
where l.sms_do_not_contact is true
  and public.normalize_phone_digits(l.phone) is not null
  and length(public.normalize_phone_digits(l.phone)) >= 8
on conflict (business_id, phone_digits) do nothing;

-- -------------------------------------------------------------
-- 4. Exclusive DLQ claim helper
-- -------------------------------------------------------------
alter table public.webhook_failures
  add column if not exists claimed_at timestamptz,
  add column if not exists claim_token text;

create or replace function public.claim_webhook_failures(limit_count integer default 50)
returns setof public.webhook_failures
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text := gen_random_uuid()::text;
begin
  return query
  with due as (
    select wf.id
    from public.webhook_failures wf
    where wf.status = 'pending'
      and coalesce(wf.next_retry_at, now()) <= now()
      and (
        wf.claimed_at is null
        or wf.claimed_at < now() - interval '10 minutes'
      )
    order by wf.created_at asc
    for update skip locked
    limit greatest(1, least(coalesce(limit_count, 50), 100))
  ),
  claimed as (
    update public.webhook_failures wf
    set
      claimed_at = now(),
      claim_token = v_token,
      status = 'processing'
    from due
    where wf.id = due.id
    returning wf.*
  )
  select * from claimed;
end;
$$;

revoke all on function public.claim_webhook_failures(integer) from public;
grant execute on function public.claim_webhook_failures(integer) to service_role;

alter table public.webhook_failures
  drop constraint if exists webhook_failures_status_check;

alter table public.webhook_failures
  add constraint webhook_failures_status_check
  check (status in ('pending', 'processing', 'success', 'failed'));

-- -------------------------------------------------------------
-- 5. Restrict SECURITY DEFINER cron helpers
-- -------------------------------------------------------------
revoke all on function public.invoke_zero_leak() from public;
revoke all on function public.configure_zero_leak_cron(text) from public;
revoke all on function public.process_dlq() from public;

grant execute on function public.invoke_zero_leak() to service_role;
grant execute on function public.configure_zero_leak_cron(text) to service_role;
grant execute on function public.process_dlq() to service_role;

do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'invoke_lead_followup'
  ) then
    execute 'revoke all on function public.invoke_lead_followup() from public';
    execute 'grant execute on function public.invoke_lead_followup() to service_role';
  end if;

  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'configure_lead_followup_cron'
  ) then
    execute 'revoke all on function public.configure_lead_followup_cron(text) from public';
    execute 'grant execute on function public.configure_lead_followup_cron(text) to service_role';
  end if;
end $$;

-- -------------------------------------------------------------
-- 6. Ensure zero-leak cron is scheduled when Vault secrets exist
-- -------------------------------------------------------------
do $$
begin
  perform public.configure_zero_leak_cron();
exception
  when others then
    raise notice 'configure_zero_leak_cron skipped: %', sqlerrm;
end $$;

-- -------------------------------------------------------------
-- 7. Public invoice share tokens
-- -------------------------------------------------------------
alter table public.invoices
  add column if not exists public_share_token text;

update public.invoices
set public_share_token = encode(gen_random_bytes(24), 'hex')
where public_share_token is null;

alter table public.invoices
  alter column public_share_token set default encode(gen_random_bytes(24), 'hex');

create unique index if not exists idx_invoices_public_share_token_unique
  on public.invoices (public_share_token)
  where public_share_token is not null;

-- Public invoice pages must look up by token via the service-role admin client.
-- Do not add a broad SELECT policy that would expose all tokenized invoices.

create or replace function public.get_public_invoice_by_token(p_token text)
returns table (
  id uuid,
  amount numeric,
  status text,
  due_date date,
  created_at timestamptz,
  business_name text,
  client_name text,
  job_title text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if nullif(trim(coalesce(p_token, '')), '') is null then
    return;
  end if;

  return query
  select
    i.id,
    i.amount,
    i.status,
    i.due_date,
    i.created_at,
    coalesce(bp.business_name, 'TradieFlow') as business_name,
    coalesce(c.name, 'Customer') as client_name,
    coalesce(j.title, 'Job') as job_title
  from public.invoices i
  left join public.jobs j on j.id = i.job_id
  left join public.clients c on c.id = j.client_id
  left join public.business_profile bp on bp.user_id = i.user_id
  where i.public_share_token = trim(p_token)
  limit 1;
end;
$$;

revoke all on function public.get_public_invoice_by_token(text) from public;
grant execute on function public.get_public_invoice_by_token(text) to anon, authenticated, service_role;

-- -------------------------------------------------------------
-- 8. Atomic client delete / archive
-- -------------------------------------------------------------
alter table public.clients
  add column if not exists archived_at timestamptz;

create or replace function public.delete_or_archive_client(p_client_id uuid)
returns table (
  outcome text,
  archived boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_invoice_count integer := 0;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (
    select 1
    from public.clients c
    where c.id = p_client_id
      and c.user_id = v_user_id
  ) then
    raise exception 'Client not found';
  end if;

  select count(*)::integer
  into v_invoice_count
  from public.invoices i
  join public.jobs j on j.id = i.job_id
  where j.client_id = p_client_id
    and i.user_id = v_user_id;

  if v_invoice_count > 0 then
    update public.clients
    set archived_at = now()
    where id = p_client_id
      and user_id = v_user_id;

    return query select 'archived'::text, true;
    return;
  end if;

  delete from public.invoices i
  using public.jobs j
  where i.job_id = j.id
    and j.client_id = p_client_id
    and i.user_id = v_user_id;

  delete from public.jobs
  where client_id = p_client_id
    and user_id = v_user_id;

  delete from public.clients
  where id = p_client_id
    and user_id = v_user_id;

  return query select 'deleted'::text, false;
end;
$$;

revoke all on function public.delete_or_archive_client(uuid) from public;
grant execute on function public.delete_or_archive_client(uuid) to authenticated, service_role;
