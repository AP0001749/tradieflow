alter table public.jobs
  add column if not exists dispatch_check_in_status text,
  add column if not exists dispatch_last_known_location text,
  add column if not exists dispatch_eta_note text,
  add column if not exists dispatch_last_checked_in_at timestamptz;

alter table public.jobs
  drop constraint if exists jobs_dispatch_check_in_status_check;

alter table public.jobs
  add constraint jobs_dispatch_check_in_status_check
  check (
    dispatch_check_in_status is null
    or dispatch_check_in_status in ('awaiting_dispatch', 'en_route', 'on_site', 'left_site')
  );

update public.jobs
set dispatch_check_in_status = case
  when status = 'in_progress' then 'on_site'
  when status = 'completed' then 'left_site'
  else 'awaiting_dispatch'
end
where dispatch_check_in_status is null;

alter table public.jobs
  alter column dispatch_check_in_status set default 'awaiting_dispatch';

comment on column public.jobs.dispatch_check_in_status is
  'Manual crew progress state used before live GPS or technician telemetry is available.';

comment on column public.jobs.dispatch_last_known_location is
  'Free-form location note for the crew, van, or landmark reported by the operator or field tech.';

comment on column public.jobs.dispatch_eta_note is
  'Free-form ETA or arrival promise note visible to dispatch and field handoff surfaces.';

comment on column public.jobs.dispatch_last_checked_in_at is
  'Timestamp of the most recent manual dispatch check-in update.';
