alter table public.jobs
  add column if not exists dispatch_sequence integer;

alter table public.jobs
  drop constraint if exists jobs_dispatch_sequence_check;

alter table public.jobs
  add constraint jobs_dispatch_sequence_check
  check (dispatch_sequence is null or dispatch_sequence >= 1);

with ranked_jobs as (
  select
    jobs.id,
    row_number() over (
      partition by
        jobs.user_id,
        coalesce(nullif(trim(jobs.assigned_technician), ''), '__unassigned__'),
        jobs.start_date
      order by
        case jobs.dispatch_priority
          when 'emergency' then 1
          when 'same_day' then 2
          when 'scheduled' then 3
          when 'backlog' then 4
          else 5
        end,
        jobs.created_at,
        jobs.title
    ) as dispatch_sequence
  from public.jobs as jobs
)
update public.jobs as jobs
set dispatch_sequence = ranked_jobs.dispatch_sequence
from ranked_jobs
where jobs.id = ranked_jobs.id
  and jobs.dispatch_sequence is null;

comment on column public.jobs.dispatch_sequence is
  'Manual run order for dispatch handoff, route packs, and printed day sheets.';
