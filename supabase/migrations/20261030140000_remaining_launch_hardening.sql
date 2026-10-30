-- =============================================================
-- Remaining launch hardening
-- - Fix cron function grants to use (text) signature
-- - Lock profiles INSERT/DELETE + billing defaults on insert
-- - Server-only Twilio number changes + canonical storage
-- - Recover abandoned DLQ processing claims
-- =============================================================

-- -------------------------------------------------------------
-- 1. Correct configure_lead_followup_cron(text) grants
-- -------------------------------------------------------------
do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'configure_lead_followup_cron'
      and pg_get_function_identity_arguments(p.oid) = 'text'
  ) then
    execute 'revoke all on function public.configure_lead_followup_cron(text) from public';
    execute 'grant execute on function public.configure_lead_followup_cron(text) to service_role';
  end if;
end $$;

-- -------------------------------------------------------------
-- 2. Profiles: no client INSERT/DELETE; protect billing on INSERT
-- -------------------------------------------------------------
drop policy if exists "profiles_owner_all" on public.profiles;
drop policy if exists profiles_owner_select on public.profiles;
drop policy if exists profiles_owner_update on public.profiles;

create policy profiles_owner_select
  on public.profiles
  for select
  using (user_id = auth.uid());

create policy profiles_owner_update
  on public.profiles
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- INSERT/DELETE remain service-role only (no authenticated policies).

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

  if tg_op = 'INSERT' then
    new.stripe_customer_id := null;
    new.stripe_subscription_id := null;
    new.subscription_tier := coalesce(new.subscription_tier, 'free');
    new.subscription_status := coalesce(new.subscription_status, 'inactive');
    new.subscription_start_date := null;
    new.subscription_end_date := null;
    new.subscription_plan_key := 'free';
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
  before insert or update on public.profiles
  for each row
  execute function public.protect_profiles_billing_columns();

revoke insert, delete on public.profiles from anon, authenticated;
grant insert, delete on public.profiles to service_role;

-- -------------------------------------------------------------
-- 3. Twilio number: server-controlled assignment only
-- -------------------------------------------------------------
create or replace function public.protect_business_twilio_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') = 'service_role' then
    if new.twilio_phone_number is not null then
      new.twilio_phone_number := case
        when left(public.normalize_phone_digits(new.twilio_phone_number), 2) = '61'
          then '+' || public.normalize_phone_digits(new.twilio_phone_number)
        when left(public.normalize_phone_digits(new.twilio_phone_number), 1) = '0'
          then '+61' || substr(public.normalize_phone_digits(new.twilio_phone_number), 2)
        else new.twilio_phone_number
      end;
    end if;
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.twilio_phone_number := null;
    return new;
  end if;

  if new.twilio_phone_number is distinct from old.twilio_phone_number then
    raise exception 'Twilio number assignment must be performed by trusted server operations';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protect_business_twilio_number on public.business_profile;
create trigger trg_protect_business_twilio_number
  before insert or update on public.business_profile
  for each row
  execute function public.protect_business_twilio_number();

-- -------------------------------------------------------------
-- 4. Recover abandoned DLQ processing claims
-- -------------------------------------------------------------
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
    where (
        wf.status = 'pending'
        and coalesce(wf.next_retry_at, now()) <= now()
      )
      or (
        wf.status = 'processing'
        and wf.claimed_at is not null
        and wf.claimed_at < now() - interval '10 minutes'
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
