alter table public.stripe_events
alter column processed_at drop not null;

alter table public.stripe_events
alter column processed_at drop default;

alter table public.stripe_events
add column if not exists status text not null default 'processed',
add column if not exists delivery_count integer not null default 1,
add column if not exists last_delivery_at timestamptz not null default now(),
add column if not exists last_error text,
add column if not exists object_id text;

update public.stripe_events
set
  status = case
    when lower(coalesce(trim(status), '')) in ('processed', 'failed', 'ignored')
      then lower(trim(status))
    else 'processed'
  end,
  delivery_count = greatest(coalesce(delivery_count, 1), 1),
  last_delivery_at = coalesce(last_delivery_at, processed_at, now()),
  processed_at = case
    when lower(coalesce(trim(status), 'processed')) = 'failed'
      then null
    else coalesce(processed_at, last_delivery_at, now())
  end;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'stripe_events_status_check'
      and conrelid = 'public.stripe_events'::regclass
  ) then
    alter table public.stripe_events
      add constraint stripe_events_status_check
      check (status in ('processed', 'failed', 'ignored'));
  end if;
end;
$$;

create index if not exists idx_stripe_events_status_last_delivery
  on public.stripe_events (status, last_delivery_at desc);

comment on column public.stripe_events.status is 'Terminal Stripe event state: processed, failed, or ignored.';
comment on column public.stripe_events.delivery_count is 'How many webhook deliveries have been seen for this Stripe event ID.';
comment on column public.stripe_events.last_delivery_at is 'Timestamp of the most recent Stripe delivery attempt seen by the app.';
comment on column public.stripe_events.last_error is 'Most recent failure or ignore diagnostic captured while handling the Stripe event.';
comment on column public.stripe_events.object_id is 'Stripe object ID attached to the event payload, when present.';