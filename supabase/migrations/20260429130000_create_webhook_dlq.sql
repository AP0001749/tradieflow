-- Migration: Webhook DLQ
CREATE TABLE IF NOT EXISTS public.webhook_failures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL, -- 'twilio' or 'resend'
  payload jsonb NOT NULL,
  error_message text,
  retry_count int DEFAULT 0,
  next_retry_at timestamptz DEFAULT now(),
  status text DEFAULT 'pending', -- 'pending', 'success', 'failed'
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.webhook_failures ENABLE ROW LEVEL SECURITY;

create or replace function public.process_dlq()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_url text;
  v_publishable_key text;
  v_cron_secret text;
  v_request_id bigint;
begin
  select decrypted_secret into v_project_url from vault.decrypted_secrets where name = 'project_url' limit 1;
  select decrypted_secret into v_publishable_key from vault.decrypted_secrets where name = 'supabase_anon_key' limit 1;
  select decrypted_secret into v_cron_secret from vault.decrypted_secrets where name = 'lead_followup_secret' limit 1;

  if v_project_url is null then
    return 0;
  end if;

  select net.http_post(
    url := v_project_url || '/functions/v1/dlq-retry',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_publishable_key,
      'x-cron-secret', v_cron_secret
    ),
    body := jsonb_build_object('source', 'supabase-cron'),
    timeout_milliseconds := 10000
  ) into v_request_id;

  return v_request_id;
end;
$$;

select cron.schedule('dlq-retry-every-5-minutes', '*/5 * * * *', 'select public.process_dlq();');
