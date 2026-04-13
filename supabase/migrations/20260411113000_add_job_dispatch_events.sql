create extension if not exists pgcrypto;

create table if not exists public.job_dispatch_events (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  user_id uuid not null,
  event_source text not null,
  event_type text not null,
  dispatch_check_in_status text,
  dispatch_eta_note text,
  dispatch_last_known_location text,
  dispatch_geo_latitude double precision,
  dispatch_geo_longitude double precision,
  dispatch_geo_accuracy_meters double precision,
  dispatch_geo_captured_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.job_dispatch_events
  drop constraint if exists job_dispatch_events_event_source_check,
  drop constraint if exists job_dispatch_events_event_type_check,
  drop constraint if exists job_dispatch_events_check_in_status_check,
  drop constraint if exists job_dispatch_events_geo_latitude_check,
  drop constraint if exists job_dispatch_events_geo_longitude_check,
  drop constraint if exists job_dispatch_events_geo_accuracy_meters_check;

alter table public.job_dispatch_events
  add constraint job_dispatch_events_event_source_check
  check (event_source in ('operator', 'field_link', 'system')),
  add constraint job_dispatch_events_event_type_check
  check (event_type in ('check_in', 'link_paused', 'link_resumed', 'link_rotated', 'dispatch_update')),
  add constraint job_dispatch_events_check_in_status_check
  check (
    dispatch_check_in_status is null
    or dispatch_check_in_status in ('awaiting_dispatch', 'en_route', 'on_site', 'left_site')
  ),
  add constraint job_dispatch_events_geo_latitude_check
  check (dispatch_geo_latitude is null or dispatch_geo_latitude between -90 and 90),
  add constraint job_dispatch_events_geo_longitude_check
  check (dispatch_geo_longitude is null or dispatch_geo_longitude between -180 and 180),
  add constraint job_dispatch_events_geo_accuracy_meters_check
  check (dispatch_geo_accuracy_meters is null or dispatch_geo_accuracy_meters >= 0);

create index if not exists job_dispatch_events_job_created_idx
  on public.job_dispatch_events (job_id, created_at desc);

create index if not exists job_dispatch_events_user_created_idx
  on public.job_dispatch_events (user_id, created_at desc);

alter table public.job_dispatch_events enable row level security;

drop policy if exists "job_dispatch_events_owner_all" on public.job_dispatch_events;

create policy "job_dispatch_events_owner_all"
  on public.job_dispatch_events
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

comment on table public.job_dispatch_events is
  'Immutable dispatch timeline for operator and field-link job updates.';

comment on column public.job_dispatch_events.event_source is
  'Origin of the dispatch event: operator, field_link, or system.';

comment on column public.job_dispatch_events.event_type is
  'Dispatch event category such as check-in, link rotation, pause, or resume.';

comment on column public.job_dispatch_events.metadata is
  'Small structured payload for event-specific details that do not need dedicated columns.';
