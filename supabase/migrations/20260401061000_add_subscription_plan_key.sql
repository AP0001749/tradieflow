alter table public.profiles
add column if not exists subscription_plan_key text;

drop function if exists public.resolve_effective_subscription_plan_key(text, text, text);

create function public.resolve_effective_subscription_plan_key(
  p_subscription_plan_key text default null,
  p_subscription_tier text default null,
  p_subscription_status text default null
)
returns text
language sql
immutable
set search_path = public
as $$
  with normalized as (
    select
      case
        when lower(coalesce(trim(p_subscription_plan_key), '')) in ('baseline', 'apex')
        then lower(trim(p_subscription_plan_key))
        else null
      end as normalized_plan_key,
      lower(coalesce(nullif(trim(p_subscription_tier), ''), 'free')) as normalized_tier,
      lower(coalesce(nullif(trim(p_subscription_status), ''), 'active')) as normalized_status
  )
  select case
    when (
      (normalized_plan_key is not null or normalized_tier = 'pro')
      and normalized_status in ('active', 'trialing', 'past_due')
    ) then coalesce(normalized_plan_key, 'baseline')
    else 'free'
  end
  from normalized;
$$;

revoke all on function public.resolve_effective_subscription_plan_key(text, text, text) from public;
grant execute on function public.resolve_effective_subscription_plan_key(text, text, text) to authenticated, service_role;

update public.profiles
set subscription_plan_key = case
  when lower(coalesce(trim(subscription_plan_key), '')) in ('free', 'baseline', 'apex')
  then lower(trim(subscription_plan_key))
  else public.resolve_effective_subscription_plan_key(
    subscription_plan_key,
    subscription_tier,
    subscription_status
  )
end;

alter table public.profiles
alter column subscription_plan_key set default 'free';

update public.profiles
set subscription_plan_key = 'free'
where subscription_plan_key is null
  or lower(coalesce(trim(subscription_plan_key), '')) not in ('free', 'baseline', 'apex');

alter table public.profiles
alter column subscription_plan_key set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_subscription_plan_key_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_subscription_plan_key_check
      check (subscription_plan_key in ('free', 'baseline', 'apex'));
  end if;
end;
$$;

comment on column public.profiles.subscription_plan_key is 'Paid plan key: free, baseline, or apex.';

insert into public.tier_limits (
  tier,
  max_clients,
  max_jobs,
  max_invoices,
  unlimited
)
values
  ('free', 3, 5, 10, false),
  ('baseline', null, null, null, true),
  ('apex', null, null, null, true),
  ('pro', null, null, null, true)
on conflict (tier) do update
set
  max_clients = excluded.max_clients,
  max_jobs = excluded.max_jobs,
  max_invoices = excluded.max_invoices,
  unlimited = excluded.unlimited;

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
  v_effective_plan_key text;
  v_limits public.tier_limits%rowtype;
begin
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  perform pg_advisory_xact_lock(hashtext(v_user_id::text));

  select subscription_tier, subscription_plan_key, subscription_status
  into v_profile
  from public.profiles
  where user_id = v_user_id
  limit 1;

  v_effective_plan_key := public.resolve_effective_subscription_plan_key(
    v_profile.subscription_plan_key,
    v_profile.subscription_tier,
    v_profile.subscription_status
  );

  select *
  into v_limits
  from public.tier_limits
  where tier = v_effective_plan_key
  limit 1;

  if not found then
    raise exception 'Missing tier limit configuration for tier %', v_effective_plan_key;
  end if;

  if not coalesce(v_limits.unlimited, false) then
    if (
      select count(*)
      from public.clients
      where user_id = v_user_id
    ) >= coalesce(v_limits.max_clients, 0) then
      raise exception '% plan limited to % clients. Upgrade to Baseline for unlimited clients.',
        initcap(v_effective_plan_key),
        v_limits.max_clients;
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
  v_effective_plan_key text;
  v_limits public.tier_limits%rowtype;
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

  select subscription_tier, subscription_plan_key, subscription_status
  into v_profile
  from public.profiles
  where user_id = v_user_id
  limit 1;

  v_effective_plan_key := public.resolve_effective_subscription_plan_key(
    v_profile.subscription_plan_key,
    v_profile.subscription_tier,
    v_profile.subscription_status
  );

  select *
  into v_limits
  from public.tier_limits
  where tier = v_effective_plan_key
  limit 1;

  if not found then
    raise exception 'Missing tier limit configuration for tier %', v_effective_plan_key;
  end if;

  if not coalesce(v_limits.unlimited, false) then
    if (
      select count(*)
      from public.jobs
      where user_id = v_user_id
    ) >= coalesce(v_limits.max_jobs, 0) then
      raise exception '% plan limited to % jobs. Upgrade to Baseline for unlimited jobs.',
        initcap(v_effective_plan_key),
        v_limits.max_jobs;
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
  v_effective_plan_key text;
  v_limits public.tier_limits%rowtype;
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

  select subscription_tier, subscription_plan_key, subscription_status
  into v_profile
  from public.profiles
  where user_id = v_user_id
  limit 1;

  v_effective_plan_key := public.resolve_effective_subscription_plan_key(
    v_profile.subscription_plan_key,
    v_profile.subscription_tier,
    v_profile.subscription_status
  );

  select *
  into v_limits
  from public.tier_limits
  where tier = v_effective_plan_key
  limit 1;

  if not found then
    raise exception 'Missing tier limit configuration for tier %', v_effective_plan_key;
  end if;

  if not coalesce(v_limits.unlimited, false) then
    if (
      select count(*)
      from public.invoices
      where user_id = v_user_id
    ) >= coalesce(v_limits.max_invoices, 0) then
      raise exception '% plan limited to % invoices. Upgrade to Baseline for unlimited invoices.',
        initcap(v_effective_plan_key),
        v_limits.max_invoices;
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
