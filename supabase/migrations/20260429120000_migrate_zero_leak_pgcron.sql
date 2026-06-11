create or replace function public.invoke_zero_leak()
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
  select decrypted_secret
  into v_project_url
  from vault.decrypted_secrets
  where name = 'project_url'
  limit 1;

  select decrypted_secret
  into v_publishable_key
  from vault.decrypted_secrets
  where name = 'supabase_anon_key'
  limit 1;

  select decrypted_secret
  into v_cron_secret
  from vault.decrypted_secrets
  where name = 'lead_followup_secret'
  limit 1;

  if v_project_url is null or v_publishable_key is null or v_cron_secret is null then
    raise exception
      'Missing required Vault secrets.';
  end if;

  select net.http_post(
    url := v_project_url || '/functions/v1/zero-leak',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_publishable_key,
      'x-cron-secret', v_cron_secret
    ),
    body := jsonb_build_object(
      'source', 'supabase-cron'
    ),
    timeout_milliseconds := 10000
  )
  into v_request_id;

  return v_request_id;
end;
$$;

create or replace function public.configure_zero_leak_cron(
  schedule_text text default '*/15 * * * *'
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing_job_id bigint;
  v_new_job_id bigint;
begin
  select jobid
  into v_existing_job_id
  from cron.job
  where jobname = 'zero-leak-every-15-minutes'
  limit 1;

  if v_existing_job_id is not null then
    perform cron.unschedule(v_existing_job_id);
  end if;

  select cron.schedule(
    'zero-leak-every-15-minutes',
    schedule_text,
    'select public.invoke_zero_leak();'
  )
  into v_new_job_id;

  return v_new_job_id;
end;
$$;
