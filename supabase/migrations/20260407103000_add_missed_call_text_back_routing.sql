alter table public.business_profile
add column if not exists twilio_phone_number text,
add column if not exists missed_call_forwarding_number text;

create index if not exists idx_business_profile_twilio_phone_number
  on public.business_profile (twilio_phone_number)
  where twilio_phone_number is not null;

comment on column public.business_profile.twilio_phone_number is 'Owned Twilio number used as the inbound call/SMS entry point for this workspace.';
comment on column public.business_profile.missed_call_forwarding_number is 'Tradie or dispatch number to dial for 15 seconds before missed-call text-back fires.';
