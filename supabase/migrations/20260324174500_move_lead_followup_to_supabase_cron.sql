create extension if not exists pg_net;
create extension if not exists pg_cron;
create extension if not exists vault;

create or replace function public.invoke_lead_followup()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_url text;
  v_publishable_key text;
  v_followup_secret text;
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
  into v_followup_secret
  from vault.decrypted_secrets
  where name = 'lead_followup_secret'
  limit 1;

  if v_project_url is null or v_publishable_key is null or v_followup_secret is null then
    raise exception
      'Missing required Vault secrets. Expected project_url, supabase_anon_key, and lead_followup_secret.';
  end if;

  select net.http_post(
    url := v_project_url || '/functions/v1/lead-followup',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_publishable_key,
      'x-cron-secret', v_followup_secret
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

comment on function public.invoke_lead_followup() is
  'Invokes the lead-followup Supabase Edge Function using Vault-managed secrets and pg_net.';

create or replace function public.configure_lead_followup_cron(
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
  where jobname = 'lead-followup-every-15-minutes'
  limit 1;

  if v_existing_job_id is not null then
    perform cron.unschedule(v_existing_job_id);
  end if;

  if not exists (
    select 1
    from vault.decrypted_secrets
    where name in ('project_url', 'supabase_anon_key', 'lead_followup_secret')
    having count(*) = 3
  ) then
    raise exception
      'Missing required Vault secrets before scheduling. Expected project_url, supabase_anon_key, and lead_followup_secret.';
  end if;

  select cron.schedule(
    'lead-followup-every-15-minutes',
    schedule_text,
    'select public.invoke_lead_followup();'
  )
  into v_new_job_id;

  return v_new_job_id;
end;
$$;

comment on function public.configure_lead_followup_cron(text) is
  'Creates or replaces the Supabase Cron schedule that invokes the lead-followup Edge Function.';

do $$
begin
  perform public.configure_lead_followup_cron();
exception
  when others then
    raise notice 'Skipping automatic lead follow-up cron scheduling: %', sqlerrm;
end;
$$;
