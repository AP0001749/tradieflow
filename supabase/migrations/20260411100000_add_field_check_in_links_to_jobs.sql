create extension if not exists pgcrypto;

alter table public.jobs
  add column if not exists dispatch_share_token uuid,
  add column if not exists dispatch_share_enabled boolean not null default true,
  add column if not exists dispatch_geo_latitude double precision,
  add column if not exists dispatch_geo_longitude double precision,
  add column if not exists dispatch_geo_accuracy_meters double precision,
  add column if not exists dispatch_geo_captured_at timestamptz;

update public.jobs
set dispatch_share_token = gen_random_uuid()
where dispatch_share_token is null;

alter table public.jobs
  alter column dispatch_share_token set default gen_random_uuid(),
  alter column dispatch_share_token set not null;

create unique index if not exists jobs_dispatch_share_token_key
  on public.jobs (dispatch_share_token);

alter table public.jobs
  drop constraint if exists jobs_dispatch_geo_latitude_check,
  drop constraint if exists jobs_dispatch_geo_longitude_check,
  drop constraint if exists jobs_dispatch_geo_accuracy_meters_check;

alter table public.jobs
  add constraint jobs_dispatch_geo_latitude_check
  check (dispatch_geo_latitude is null or dispatch_geo_latitude between -90 and 90),
  add constraint jobs_dispatch_geo_longitude_check
  check (dispatch_geo_longitude is null or dispatch_geo_longitude between -180 and 180),
  add constraint jobs_dispatch_geo_accuracy_meters_check
  check (dispatch_geo_accuracy_meters is null or dispatch_geo_accuracy_meters >= 0);

comment on column public.jobs.dispatch_share_token is
  'Opaque token for the public technician field check-in page. Treat as a bearer secret.';

comment on column public.jobs.dispatch_share_enabled is
  'Controls whether the public technician field check-in link can update this job.';

comment on column public.jobs.dispatch_geo_latitude is
  'Latest technician-submitted browser geolocation latitude for dispatch visibility.';

comment on column public.jobs.dispatch_geo_longitude is
  'Latest technician-submitted browser geolocation longitude for dispatch visibility.';

comment on column public.jobs.dispatch_geo_accuracy_meters is
  'Accuracy radius, in meters, reported by the browser geolocation API.';

comment on column public.jobs.dispatch_geo_captured_at is
  'Timestamp when the latest technician-submitted browser geolocation was captured.';
