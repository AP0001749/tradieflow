alter table public.jobs
add column if not exists trade_vertical text,
add column if not exists equipment_make text,
add column if not exists warranty_status text,
add column if not exists site_access_notes text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'jobs_trade_vertical_check'
      and conrelid = 'public.jobs'::regclass
  ) then
    alter table public.jobs
      add constraint jobs_trade_vertical_check
      check (
        trade_vertical is null
        or trade_vertical in ('hvac', 'plumbing', 'electrical', 'mixed_trade')
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'jobs_warranty_status_check'
      and conrelid = 'public.jobs'::regclass
  ) then
    alter table public.jobs
      add constraint jobs_warranty_status_check
      check (
        warranty_status is null
        or warranty_status in ('in_warranty', 'out_of_warranty', 'unknown')
      );
  end if;
end $$;

comment on column public.jobs.trade_vertical is 'Primary trade vertical for the job: HVAC, plumbing, electrical, or mixed trade.';
comment on column public.jobs.equipment_make is 'Manufacturer or equipment make for the asset being serviced or installed.';
comment on column public.jobs.warranty_status is 'Warranty state for the job: in warranty, out of warranty, or unknown.';
comment on column public.jobs.site_access_notes is 'Site access, gate code, roof access, or occupant instructions for dispatch.';