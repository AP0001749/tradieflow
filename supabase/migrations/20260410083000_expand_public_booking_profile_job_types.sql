drop function if exists public.get_public_business_profile_by_slug(text);

create function public.get_public_business_profile_by_slug(p_booking_url_slug text)
returns table (
  business_name text,
  booking_url_slug text,
  default_job_types text[]
)
language sql
security definer
stable
set search_path = public
as $$
  select
    business_profile.business_name,
    business_profile.booking_url_slug,
    coalesce(business_profile.default_job_types, '{}'::text[]) as default_job_types
  from public.business_profile as business_profile
  where business_profile.booking_url_slug = lower(trim(coalesce(p_booking_url_slug, '')))
  limit 1;
$$;

revoke all on function public.get_public_business_profile_by_slug(text) from public;
grant execute on function public.get_public_business_profile_by_slug(text) to anon, authenticated, service_role;

comment on function public.get_public_business_profile_by_slug(text) is
  'Returns the public-safe dispatch-audit profile payload for a single public lead link slug.';
