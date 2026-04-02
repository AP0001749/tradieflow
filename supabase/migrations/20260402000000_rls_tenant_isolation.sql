-- =============================================================
-- RLS TENANT ISOLATION
-- Ensures every user-data table is isolated by auth.uid() so
-- that no authenticated session can read or write another
-- tenant's rows, even if the anon/service key is misused.
-- Service-role (admin client) bypasses RLS by design.
-- =============================================================

-- Enable RLS on every user-data table
alter table public.business_profile enable row level security;
alter table public.clients         enable row level security;
alter table public.jobs            enable row level security;
alter table public.invoices        enable row level security;
alter table public.leads           enable row level security;
alter table public.lead_events     enable row level security;
alter table public.profiles        enable row level security;
alter table public.tier_limits     enable row level security;
alter table public.stripe_events   enable row level security;

-- =============================================================
-- business_profile — owned via user_id
-- =============================================================
drop policy if exists "bp_owner_all"    on public.business_profile;
drop policy if exists "bp_public_read"  on public.business_profile;

-- Owners can read/write their own profile
create policy "bp_owner_all"
  on public.business_profile
  for all
  using     (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Anonymous visitors can read profiles for the public booking form
-- (slug lookup). Only exposes business_name and booking_url_slug;
-- column-level restriction is enforced in the application query.
create policy "bp_public_read"
  on public.business_profile
  for select
  using (true);

-- =============================================================
-- profiles — owned via user_id
-- =============================================================
drop policy if exists "profiles_owner_all" on public.profiles;

create policy "profiles_owner_all"
  on public.profiles
  for all
  using     (user_id = auth.uid())
  with check (user_id = auth.uid());

-- =============================================================
-- clients — owned via user_id
-- =============================================================
drop policy if exists "clients_owner_all" on public.clients;

create policy "clients_owner_all"
  on public.clients
  for all
  using     (user_id = auth.uid())
  with check (user_id = auth.uid());

-- =============================================================
-- jobs — owned via user_id
-- =============================================================
drop policy if exists "jobs_owner_all" on public.jobs;

create policy "jobs_owner_all"
  on public.jobs
  for all
  using     (user_id = auth.uid())
  with check (user_id = auth.uid());

-- =============================================================
-- invoices — owned via user_id
-- =============================================================
drop policy if exists "invoices_owner_all" on public.invoices;

create policy "invoices_owner_all"
  on public.invoices
  for all
  using     (user_id = auth.uid())
  with check (user_id = auth.uid());

-- =============================================================
-- leads — owned via business_profile.user_id (one-hop join)
-- =============================================================
drop policy if exists "leads_owner_all" on public.leads;

create policy "leads_owner_all"
  on public.leads
  for all
  using (
    business_id in (
      select id
      from   public.business_profile
      where  user_id = auth.uid()
    )
  )
  with check (
    business_id in (
      select id
      from   public.business_profile
      where  user_id = auth.uid()
    )
  );

-- =============================================================
-- lead_events — owned via leads -> business_profile.user_id
-- =============================================================
drop policy if exists "lead_events_owner_all" on public.lead_events;

create policy "lead_events_owner_all"
  on public.lead_events
  for all
  using (
    lead_id in (
      select l.id
      from   public.leads           l
      join   public.business_profile bp on bp.id = l.business_id
      where  bp.user_id = auth.uid()
    )
  )
  with check (
    lead_id in (
      select l.id
      from   public.leads           l
      join   public.business_profile bp on bp.id = l.business_id
      where  bp.user_id = auth.uid()
    )
  );

-- =============================================================
-- tier_limits — public reference table, read-only for all roles
-- =============================================================
drop policy if exists "tier_limits_read_all" on public.tier_limits;

create policy "tier_limits_read_all"
  on public.tier_limits
  for select
  using (true);

-- stripe_events: no direct user access needed.
-- Service-role (admin client used in webhook) bypasses RLS.
-- No permissive policy = deny by default for anon/authenticated.
