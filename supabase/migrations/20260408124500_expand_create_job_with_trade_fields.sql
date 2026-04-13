drop function if exists public.create_job_with_limit(uuid, text, text, numeric, date, text);
drop function if exists public.create_job_with_limit(uuid, text, text, numeric, date, text, text, text, text, text);

create function public.create_job_with_limit(
  p_client_id uuid,
  p_title text,
  p_status text default 'draft',
  p_price numeric default null,
  p_start_date date default null,
  p_description text default null,
  p_trade_vertical text default null,
  p_warranty_status text default null,
  p_equipment_make text default null,
  p_site_access_notes text default null
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
  v_trade_vertical text := nullif(trim(coalesce(p_trade_vertical, '')), '');
  v_warranty_status text := nullif(trim(coalesce(p_warranty_status, '')), '');
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

  if v_trade_vertical is not null and v_trade_vertical not in ('hvac', 'plumbing', 'electrical', 'mixed_trade') then
    raise exception 'Invalid trade vertical';
  end if;

  if v_warranty_status is not null and v_warranty_status not in ('in_warranty', 'out_of_warranty', 'unknown') then
    raise exception 'Invalid warranty status';
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
    description,
    trade_vertical,
    warranty_status,
    equipment_make,
    site_access_notes
  )
  values (
    v_user_id,
    p_client_id,
    p_title,
    p_status,
    p_price,
    p_start_date,
    nullif(p_description, ''),
    v_trade_vertical,
    v_warranty_status,
    nullif(trim(coalesce(p_equipment_make, '')), ''),
    nullif(trim(coalesce(p_site_access_notes, '')), '')
  )
  returning * into v_job;

  return v_job;
end;
$$;

revoke all on function public.create_job_with_limit(uuid, text, text, numeric, date, text, text, text, text, text) from public;
grant execute on function public.create_job_with_limit(uuid, text, text, numeric, date, text, text, text, text, text) to authenticated;
