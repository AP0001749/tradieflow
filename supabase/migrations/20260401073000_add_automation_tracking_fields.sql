alter table public.jobs
add column if not exists quote_sent_at timestamptz,
add column if not exists quote_followup_sent_at timestamptz;

alter table public.invoices
add column if not exists paid_at timestamptz,
add column if not exists review_request_sent_at timestamptz;

update public.invoices
set paid_at = coalesce(paid_at, updated_at, created_at, now())
where status = 'paid'
  and paid_at is null;

comment on column public.jobs.quote_sent_at is 'When the quote or proposal was sent to the customer.';
comment on column public.jobs.quote_followup_sent_at is 'When the post-quote nurture follow-up was sent.';
comment on column public.invoices.paid_at is 'When the invoice was marked as paid.';
comment on column public.invoices.review_request_sent_at is 'When the post-payment review request was sent.';
