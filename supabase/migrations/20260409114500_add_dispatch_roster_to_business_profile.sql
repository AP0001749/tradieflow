alter table public.business_profile
add column if not exists dispatch_roster text[] default '{}'::text[];

update public.business_profile
set dispatch_roster = '{}'::text[]
where dispatch_roster is null;

alter table public.business_profile
alter column dispatch_roster set default '{}'::text[];

alter table public.business_profile
alter column dispatch_roster set not null;

comment on column public.business_profile.dispatch_roster is
  'Reusable crew or technician names used for assignment shortcuts across the dispatch desk and job forms.';
