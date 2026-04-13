alter table public.business_profile
  add column if not exists emergency_response_sla_minutes integer not null default 15,
  add column if not exists same_day_response_sla_minutes integer not null default 60,
  add column if not exists scheduled_response_sla_minutes integer not null default 240,
  add column if not exists quote_response_sla_minutes integer not null default 1440;

alter table public.business_profile
  drop constraint if exists business_profile_response_sla_minutes_check;

alter table public.business_profile
  add constraint business_profile_response_sla_minutes_check
  check (
    emergency_response_sla_minutes between 1 and 10080
    and same_day_response_sla_minutes between 1 and 10080
    and scheduled_response_sla_minutes between 1 and 10080
    and quote_response_sla_minutes between 1 and 10080
  );

comment on column public.business_profile.emergency_response_sla_minutes is
  'Workspace response target, in minutes, for emergency leads.';

comment on column public.business_profile.same_day_response_sla_minutes is
  'Workspace response target, in minutes, for same-day leads.';

comment on column public.business_profile.scheduled_response_sla_minutes is
  'Workspace response target, in minutes, for scheduled leads.';

comment on column public.business_profile.quote_response_sla_minutes is
  'Workspace response target, in minutes, for quote or install leads.';
