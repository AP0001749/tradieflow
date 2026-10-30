-- Hold SMS retries that cannot prove suppression state.
-- Apply after 20261030140000. Redeploy dlq-retry only after this runs.

alter table public.webhook_failures
  drop constraint if exists webhook_failures_status_check;

alter table public.webhook_failures
  add constraint webhook_failures_status_check
  check (status in ('pending', 'processing', 'success', 'failed', 'quarantined'));

-- Legacy Twilio queue rows have no business scope, so suppression cannot be checked.
update public.webhook_failures
set
  status = 'quarantined',
  claimed_at = null,
  claim_token = null,
  error_message = 'quarantined: missing business_id for SMS suppression check'
where provider = 'twilio'
  and status in ('pending', 'processing')
  and coalesce(payload->>'business_id', payload->>'businessId', '') = '';
