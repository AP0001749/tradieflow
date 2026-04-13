create table if not exists public.twilio_missed_call_textbacks (
  call_sid text primary key,
  lead_id uuid not null references public.leads(id) on delete cascade,
  business_id uuid not null references public.business_profile(id) on delete cascade,
  from_number text not null,
  to_number text not null,
  dial_status text not null,
  status text not null default 'processing',
  twilio_message_sid text,
  last_error text,
  processing_started_at timestamptz not null default now(),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint twilio_missed_call_textbacks_status_check
    check (status in ('processing', 'sent', 'failed', 'suppressed'))
);

create index if not exists idx_twilio_missed_call_textbacks_business_id
  on public.twilio_missed_call_textbacks (business_id, created_at desc);

create index if not exists idx_twilio_missed_call_textbacks_lead_id
  on public.twilio_missed_call_textbacks (lead_id, created_at desc);

drop function if exists public.claim_missed_call_text_back(text, uuid, uuid, text, text, text);

create function public.claim_missed_call_text_back(
  p_call_sid text,
  p_lead_id uuid,
  p_business_id uuid,
  p_from_number text,
  p_to_number text,
  p_dial_status text
)
returns table (
  should_send boolean,
  claim_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing_status text;
begin
  if nullif(trim(coalesce(p_call_sid, '')), '') is null then
    return query select false, 'missing_call_sid'::text;
    return;
  end if;

  insert into public.twilio_missed_call_textbacks (
    call_sid,
    lead_id,
    business_id,
    from_number,
    to_number,
    dial_status,
    status,
    processing_started_at
  )
  values (
    p_call_sid,
    p_lead_id,
    p_business_id,
    p_from_number,
    p_to_number,
    p_dial_status,
    'processing',
    now()
  )
  on conflict (call_sid) do nothing;

  if found then
    return query select true, 'processing'::text;
    return;
  end if;

  update public.twilio_missed_call_textbacks
  set
    status = 'processing',
    lead_id = p_lead_id,
    business_id = p_business_id,
    from_number = p_from_number,
    to_number = p_to_number,
    dial_status = p_dial_status,
    last_error = null,
    processing_started_at = now(),
    updated_at = now()
  where call_sid = p_call_sid
    and status = 'failed'
  returning status into v_existing_status;

  if found then
    return query select true, 'processing'::text;
    return;
  end if;

  select status
  into v_existing_status
  from public.twilio_missed_call_textbacks
  where call_sid = p_call_sid;

  return query select false, coalesce(v_existing_status, 'unknown')::text;
end;
$$;

revoke all on table public.twilio_missed_call_textbacks from public;
grant select, insert, update on table public.twilio_missed_call_textbacks to service_role;

revoke all on function public.claim_missed_call_text_back(text, uuid, uuid, text, text, text) from public;
grant execute on function public.claim_missed_call_text_back(text, uuid, uuid, text, text, text) to service_role;

comment on table public.twilio_missed_call_textbacks is 'Idempotency and delivery state for missed-call text-back sends keyed by Twilio CallSid.';
comment on function public.claim_missed_call_text_back(text, uuid, uuid, text, text, text) is 'Atomically claims a Twilio CallSid before sending a missed-call text-back.';
