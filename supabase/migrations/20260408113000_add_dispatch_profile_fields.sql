alter table public.business_profile
  add column if not exists team_size text,
  add column if not exists after_hours_coverage text,
  add column if not exists dispatch_radius text;

comment on column public.business_profile.team_size is
  'Operator-reported team size used for onboarding and dispatch planning.';

comment on column public.business_profile.after_hours_coverage is
  'How the workspace covers urgent or after-hours callouts.';

comment on column public.business_profile.dispatch_radius is
  'Approximate dispatch radius used when planning response footprint and handoff coverage.';
