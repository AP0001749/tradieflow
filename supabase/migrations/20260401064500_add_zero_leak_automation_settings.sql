alter table public.business_profile
add column if not exists missed_call_text_enabled boolean not null default false,
add column if not exists missed_call_text_template text,
add column if not exists quote_followup_enabled boolean not null default false,
add column if not exists quote_followup_delay_hours integer not null default 48,
add column if not exists quote_followup_template text,
add column if not exists review_request_enabled boolean not null default false,
add column if not exists review_request_delay_hours integer not null default 24,
add column if not exists review_request_template text;

update public.business_profile
set
  missed_call_text_template = coalesce(
    nullif(trim(missed_call_text_template), ''),
    'Hi, this is {{business_name}}. We''re on the tools right now. What do you need help with? Reply here and we''ll get back to you ASAP.'
  ),
  quote_followup_template = coalesce(
    nullif(trim(quote_followup_template), ''),
    'Hi {{contact_name}}, just checking if you had any questions about the quote from {{business_name}}. Reply here if you''d like to go ahead.'
  ),
  review_request_template = coalesce(
    nullif(trim(review_request_template), ''),
    'Hi {{contact_name}}, thanks for choosing {{business_name}}. If the job went well, would you mind leaving a quick Google review? {{google_review_url}}'
  ),
  quote_followup_delay_hours = greatest(coalesce(quote_followup_delay_hours, 48), 1),
  review_request_delay_hours = greatest(coalesce(review_request_delay_hours, 24), 1);

alter table public.business_profile
alter column missed_call_text_template
set default 'Hi, this is {{business_name}}. We''re on the tools right now. What do you need help with? Reply here and we''ll get back to you ASAP.';

alter table public.business_profile
alter column quote_followup_template
set default 'Hi {{contact_name}}, just checking if you had any questions about the quote from {{business_name}}. Reply here if you''d like to go ahead.';

alter table public.business_profile
alter column review_request_template
set default 'Hi {{contact_name}}, thanks for choosing {{business_name}}. If the job went well, would you mind leaving a quick Google review? {{google_review_url}}';

comment on column public.business_profile.missed_call_text_enabled is 'Whether the missed-call text back workflow is enabled for this business.';
comment on column public.business_profile.missed_call_text_template is 'Template for the missed-call text back automation.';
comment on column public.business_profile.quote_followup_enabled is 'Whether quote nurture follow-up is enabled for this business.';
comment on column public.business_profile.quote_followup_delay_hours is 'Delay in hours before the quote nurture message should be sent.';
comment on column public.business_profile.quote_followup_template is 'Template for the quote nurture follow-up automation.';
comment on column public.business_profile.review_request_enabled is 'Whether post-payment review requests are enabled for this business.';
comment on column public.business_profile.review_request_delay_hours is 'Delay in hours before the review request should be sent.';
comment on column public.business_profile.review_request_template is 'Template for the post-payment review request automation.';
