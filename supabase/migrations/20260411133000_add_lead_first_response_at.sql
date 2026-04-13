alter table public.leads
  add column if not exists first_responded_at timestamptz;

update public.leads
set first_responded_at = last_contacted_at
where first_responded_at is null
  and last_contacted_at is not null
  and status in ('contacted', 'booked', 'won');

create index if not exists leads_business_first_response_idx
  on public.leads (business_id, first_responded_at);

comment on column public.leads.first_responded_at is
  'Immutable first operator or automation response timestamp used for response SLA hit/miss scoring.';
