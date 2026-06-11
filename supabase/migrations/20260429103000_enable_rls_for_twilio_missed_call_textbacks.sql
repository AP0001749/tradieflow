alter table public.twilio_missed_call_textbacks enable row level security;

drop policy if exists "twilio_missed_call_textbacks_owner_read" on public.twilio_missed_call_textbacks;

create policy "twilio_missed_call_textbacks_owner_read"
  on public.twilio_missed_call_textbacks
  for select
  using (
    business_id in (
      select id
      from public.business_profile
      where user_id = auth.uid()
    )
  );
