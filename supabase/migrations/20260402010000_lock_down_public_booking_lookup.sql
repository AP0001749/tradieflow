drop policy if exists "bp_public_read" on public.business_profile;

revoke all on table public.business_profile from anon;

drop function if exists public.get_public_business_profile_by_slug(text);

create function public.get_public_business_profile_by_slug(p_booking_url_slug text)
returns table (
  business_name text,
  booking_url_slug text
)
language sql
security definer
stable
set search_path = public
as $$
  select
    business_profile.business_name,
    business_profile.booking_url_slug
  from public.business_profile as business_profile
  where business_profile.booking_url_slug = lower(trim(coalesce(p_booking_url_slug, '')))
  limit 1;
$$;

revoke all on function public.get_public_business_profile_by_slug(text) from public;
grant execute on function public.get_public_business_profile_by_slug(text) to anon, authenticated, service_role;

comment on function public.get_public_business_profile_by_slug(text) is
  'Returns the public-safe booking profile payload for a single booking URL slug.';