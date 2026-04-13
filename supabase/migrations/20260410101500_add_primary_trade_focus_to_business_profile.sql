alter table public.business_profile
  add column if not exists primary_trade_focus text;

update public.business_profile as business_profile
set primary_trade_focus = inferred.primary_trade_focus
from (
  select
    profile.id,
    case
      when hvac_hits and not plumbing_hits and not electrical_hits then 'hvac'
      when plumbing_hits and not hvac_hits and not electrical_hits then 'plumbing'
      when electrical_hits and not hvac_hits and not plumbing_hits then 'electrical'
      else 'mixed_trade'
    end as primary_trade_focus
  from (
    select
      business_profile.id,
      exists (
        select 1
        from unnest(coalesce(business_profile.default_job_types, '{}'::text[])) as job_type(value)
        where job_type.value ~* '(split|ducted|heating|cooling|air|refrigeration)'
      ) as hvac_hits,
      exists (
        select 1
        from unnest(coalesce(business_profile.default_job_types, '{}'::text[])) as job_type(value)
        where job_type.value ~* '(drain|plumb|pipe|hot[_ ]?water|leak|toilet|tap)'
      ) as plumbing_hits,
      exists (
        select 1
        from unnest(coalesce(business_profile.default_job_types, '{}'::text[])) as job_type(value)
        where job_type.value ~* '(electrical|switchboard|spark|power|lighting|smoke[_ ]?alarm|rcd|ev[_ ]?charger)'
      ) as electrical_hits
    from public.business_profile
  ) as profile
) as inferred
where business_profile.id = inferred.id
  and (
    business_profile.primary_trade_focus is null
    or business_profile.primary_trade_focus not in ('hvac', 'plumbing', 'electrical', 'mixed_trade')
  );

update public.business_profile
set primary_trade_focus = 'mixed_trade'
where primary_trade_focus is null;

alter table public.business_profile
  alter column primary_trade_focus set default 'mixed_trade';

alter table public.business_profile
  alter column primary_trade_focus set not null;

alter table public.business_profile
  drop constraint if exists business_profile_primary_trade_focus_check;

alter table public.business_profile
  add constraint business_profile_primary_trade_focus_check
  check (primary_trade_focus in ('hvac', 'plumbing', 'electrical', 'mixed_trade'));

drop function if exists public.get_public_business_profile_by_slug(text);

create function public.get_public_business_profile_by_slug(p_booking_url_slug text)
returns table (
  business_name text,
  booking_url_slug text,
  default_job_types text[],
  primary_trade_focus text
)
language sql
security definer
stable
set search_path = public
as $$
  select
    business_profile.business_name,
    business_profile.booking_url_slug,
    coalesce(business_profile.default_job_types, '{}'::text[]) as default_job_types,
    business_profile.primary_trade_focus
  from public.business_profile as business_profile
  where business_profile.booking_url_slug = lower(trim(coalesce(p_booking_url_slug, '')))
  limit 1;
$$;

revoke all on function public.get_public_business_profile_by_slug(text) from public;
grant execute on function public.get_public_business_profile_by_slug(text) to anon, authenticated, service_role;

comment on function public.get_public_business_profile_by_slug(text) is
  'Returns the public-safe dispatch-audit profile payload for a single public lead link slug, including trade focus and job type presets.';
