drop function if exists public.claim_due_quote_followups(integer);

create function public.claim_due_quote_followups(
  limit_count integer default 50
)
returns table (
  job_id uuid,
  user_id uuid,
  job_title text,
  job_price numeric,
  quote_sent_at timestamptz,
  business_name text,
  reply_to_email text,
  quote_followup_template text,
  twilio_phone_number text,
  client_name text,
  client_email text,
  client_phone text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with candidate_ids as (
    select jobs.id
    from public.jobs as jobs
    inner join public.business_profile as business_profile
      on business_profile.user_id = jobs.user_id
    inner join public.clients as clients
      on clients.id = jobs.client_id
      and clients.user_id = jobs.user_id
    where business_profile.quote_followup_enabled = true
      and jobs.quote_sent_at is not null
      and jobs.quote_followup_sent_at is null
      and (
        coalesce(nullif(trim(clients.email), ''), '') <> ''
        or (
          coalesce(nullif(trim(clients.phone), ''), '') <> ''
          and coalesce(nullif(trim(business_profile.twilio_phone_number), ''), '') <> ''
        )
      )
      and jobs.quote_sent_at
        + (greatest(coalesce(business_profile.quote_followup_delay_hours, 48), 1)::text || ' hours')::interval
        <= now()
      and (
        jobs.quote_followup_processing = false
        or jobs.quote_followup_processing_started_at is null
        or jobs.quote_followup_processing_started_at <= now() - interval '15 minutes'
      )
    order by jobs.quote_sent_at asc, jobs.created_at asc
    limit greatest(coalesce(limit_count, 50), 1)
    for update of jobs skip locked
  ),
  claimed as (
    update public.jobs as jobs
    set quote_followup_processing = true,
        quote_followup_processing_started_at = now(),
        quote_followup_last_error = null
    where jobs.id in (select candidate_ids.id from candidate_ids)
    returning jobs.*
  )
  select
    claimed.id,
    claimed.user_id,
    claimed.title,
    claimed.price,
    claimed.quote_sent_at,
    business_profile.business_name,
    business_profile.reply_to_email,
    business_profile.quote_followup_template,
    business_profile.twilio_phone_number,
    clients.name,
    clients.email,
    clients.phone
  from claimed
  inner join public.business_profile as business_profile
    on business_profile.user_id = claimed.user_id
  inner join public.clients as clients
    on clients.id = claimed.client_id
    and clients.user_id = claimed.user_id;
end;
$$;

revoke all on function public.claim_due_quote_followups(integer) from public;
grant execute on function public.claim_due_quote_followups(integer) to service_role;

drop function if exists public.claim_due_review_requests(integer);

create function public.claim_due_review_requests(
  limit_count integer default 50
)
returns table (
  invoice_id uuid,
  user_id uuid,
  job_title text,
  invoice_amount numeric,
  paid_at timestamptz,
  business_name text,
  reply_to_email text,
  review_request_template text,
  google_review_url text,
  twilio_phone_number text,
  client_name text,
  client_email text,
  client_phone text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with candidate_ids as (
    select invoices.id
    from public.invoices as invoices
    inner join public.jobs as jobs
      on jobs.id = invoices.job_id
      and jobs.user_id = invoices.user_id
    inner join public.business_profile as business_profile
      on business_profile.user_id = invoices.user_id
    inner join public.clients as clients
      on clients.id = jobs.client_id
      and clients.user_id = invoices.user_id
    where business_profile.review_request_enabled = true
      and coalesce(business_profile.google_review_url, '') <> ''
      and invoices.status = 'paid'
      and invoices.paid_at is not null
      and invoices.review_request_sent_at is null
      and (
        coalesce(nullif(trim(clients.email), ''), '') <> ''
        or (
          coalesce(nullif(trim(clients.phone), ''), '') <> ''
          and coalesce(nullif(trim(business_profile.twilio_phone_number), ''), '') <> ''
        )
      )
      and invoices.paid_at
        + (greatest(coalesce(business_profile.review_request_delay_hours, 24), 1)::text || ' hours')::interval
        <= now()
      and (
        invoices.review_request_processing = false
        or invoices.review_request_processing_started_at is null
        or invoices.review_request_processing_started_at <= now() - interval '15 minutes'
      )
    order by invoices.paid_at asc, invoices.created_at asc
    limit greatest(coalesce(limit_count, 50), 1)
    for update of invoices skip locked
  ),
  claimed as (
    update public.invoices as invoices
    set review_request_processing = true,
        review_request_processing_started_at = now(),
        review_request_last_error = null
    where invoices.id in (select candidate_ids.id from candidate_ids)
    returning invoices.*
  )
  select
    claimed.id,
    claimed.user_id,
    jobs.title,
    claimed.amount,
    claimed.paid_at,
    business_profile.business_name,
    business_profile.reply_to_email,
    business_profile.review_request_template,
    business_profile.google_review_url,
    business_profile.twilio_phone_number,
    clients.name,
    clients.email,
    clients.phone
  from claimed
  inner join public.jobs as jobs
    on jobs.id = claimed.job_id
    and jobs.user_id = claimed.user_id
  inner join public.business_profile as business_profile
    on business_profile.user_id = claimed.user_id
  inner join public.clients as clients
    on clients.id = jobs.client_id
    and clients.user_id = claimed.user_id;
end;
$$;

revoke all on function public.claim_due_review_requests(integer) from public;
grant execute on function public.claim_due_review_requests(integer) to service_role;
