alter table public.leads
add column if not exists sms_do_not_contact boolean not null default false,
add column if not exists sms_do_not_contact_reason text,
add column if not exists sms_last_inbound_at timestamptz,
add column if not exists sms_last_inbound_from text,
add column if not exists sms_last_inbound_intent text,
add column if not exists sms_last_inbound_message text,
add column if not exists sms_last_inbound_sid text,
add column if not exists sms_opted_out_at timestamptz;

comment on column public.leads.sms_do_not_contact is 'When true, automated SMS delivery should be suppressed for this lead.';
comment on column public.leads.sms_do_not_contact_reason is 'Inbound reason for suppressing SMS, such as STOP or manual override notes.';
comment on column public.leads.sms_last_inbound_at is 'Timestamp of the most recent inbound SMS received for the lead.';
comment on column public.leads.sms_last_inbound_from is 'Phone number that sent the most recent inbound SMS.';
comment on column public.leads.sms_last_inbound_intent is 'Heuristic intent label for the latest inbound SMS reply.';
comment on column public.leads.sms_last_inbound_message is 'Body of the latest inbound SMS received for the lead.';
comment on column public.leads.sms_last_inbound_sid is 'Twilio MessageSid for the latest inbound SMS received for the lead.';
comment on column public.leads.sms_opted_out_at is 'When the lead most recently sent a STOP-style SMS opt-out.';