# Lead Automation System Setup Guide

## Overview

TradieFlow has two valid follow-up paths right now:

- Target production path:
  `Public booking page -> /api/leads/create -> leads + lead_events -> Supabase Cron -> Edge Function -> Resend`
- Hosted compatibility path:
  `Public booking page -> /api/leads/create -> leads + lead_events -> GitHub Actions -> /api/cron/leads-followup -> Resend`

It automatically:

1. Captures leads from a public booking page
2. Sends an immediate confirmation email
3. Follows up at 24-hour and 48-hour intervals
4. Lets the dashboard convert booked leads into jobs

## 1. Run Database Migrations

```bash
npx supabase db push
```

Relevant migrations include:

- `20260324153000_hardening_patch.sql`
- `20260324174500_move_lead_followup_to_supabase_cron.sql`
- `20260330150000_centralize_tier_limits.sql`
- `20260401064500_add_zero_leak_automation_settings.sql`
- `20260404083000_add_lead_sms_tracking.sql`
- `20260407103000_add_missed_call_text_back_routing.sql`
- `20260408100000_add_missed_call_textback_claims.sql`

## 2. Configure Local / App Environment Variables

Add these to `.env.local` and your app host:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
UPSTASH_REDIS_REST_URL=your-upstash-url
UPSTASH_REDIS_REST_TOKEN=your-upstash-token
RESEND_API_KEY=your-resend-key
RESEND_SENDER_EMAIL=your-verified-sender
RESEND_REPLY_TO_EMAIL=your-reply-to-email
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
LEAD_FOLLOWUP_SECRET=your-random-secure-followup-secret
CRON_SECRET=your-random-secure-followup-secret
```

Notes:

- `NEXT_PUBLIC_APP_URL` is required for auth redirects and email links.
- Lead capture intentionally fails closed if Upstash is missing.
- Email sending now fails fast if no verified sender is configured.
- `TWILIO_AUTH_TOKEN` is required to verify inbound Twilio webhook signatures.
- `TWILIO_ACCOUNT_SID` is required when TradieFlow sends missed-call text backs, quote follow-ups, or review requests through Twilio.
- `TWILIO_SKIP_SIGNATURE_VALIDATION=true` is available only for explicit local testing and should stay off in production.
- `CRON_SECRET` is a legacy alias. The compatibility route accepts either name, and it can honor a comma-separated allowlist during secret rotation.

Generate a secure follow-up secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 3. Configure Supabase Cron + Edge Function

Create Vault secrets in Supabase:

```sql
select vault.create_secret('https://YOUR_PROJECT_REF.supabase.co', 'project_url');
select vault.create_secret('YOUR_SUPABASE_ANON_KEY', 'supabase_anon_key');
select vault.create_secret('YOUR_LEAD_FOLLOWUP_SECRET', 'lead_followup_secret');
```

Deploy the Edge Function:

```bash
npx supabase functions deploy lead-followup --no-verify-jwt
```

Set Edge Function secrets:

```bash
npx supabase secrets set \
  LEAD_FOLLOWUP_SECRET=your-random-secure-followup-secret \
  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
  RESEND_API_KEY=your-resend-key \
  RESEND_SENDER_EMAIL=your-verified-sender \
  RESEND_REPLY_TO_EMAIL=your-reply-to-email
```

If the migration ran before the Vault secrets existed, reconfigure the scheduler:

```sql
select public.configure_lead_followup_cron();
```

## 3A. Configure GitHub Actions Compatibility Scheduling

If Supabase Cron is not live yet, the repo includes a GitHub Actions fallback that hits `/api/cron/leads-followup`.

Set these repo secrets:

- `APP_BASE_URL`
- `LEAD_FOLLOWUP_SECRET` or legacy `CRON_SECRET`

Important:

- The GitHub Actions secret must be accepted by the app-host route configuration.
- The route can accept both `LEAD_FOLLOWUP_SECRET` and `CRON_SECRET` during cutover.
- The GitHub Actions workflow will try both secret names if both repo secrets are configured.
- Prefer `POST /api/cron/leads-followup`. `GET` remains available only as a compatibility alias.
- The route accepts either `Authorization: Bearer <secret>` or `x-cron-secret: <secret>`.
- Once Supabase Cron is healthy, you can keep the workflow only as a manual check or disable its schedule.

## 3B. Configure Twilio Inbound SMS

TradieFlow now includes an inbound SMS webhook at `/api/twilio/webhook`.

Use it for replies to existing leads only:

- Configure the Twilio phone number webhook as `POST https://your-app-host/api/twilio/webhook`
- Keep signature validation enabled in production with `TWILIO_AUTH_TOKEN`
- The route first resolves the receiving Twilio number to a workspace, then matches inbound messages to existing leads by phone number inside that workspace
- Twilio webhook retries are deduped by the latest inbound `MessageSid` stored on the matched lead
- Matched replies log a `sms_received` or `sms_opt_out` event and clear automated follow-up scheduling so a reply does not keep triggering nurture emails
- STOP-style replies mark the lead as `sms_do_not_contact = true` once the new migration is applied

## 3C. Configure Twilio Missed-Call Text Back

TradieFlow also includes first-party missed-call text back routes:

- Configure the Twilio phone number voice webhook as `POST https://your-app-host/api/twilio/voice`
- In `/dashboard/settings`, set the same owned Twilio number and the tradie/dispatcher forwarding number
- Twilio dials the forwarding number for 15 seconds
- If the dial leg returns `busy`, `no-answer`, `failed`, or `canceled`, Twilio calls `/api/twilio/missed-call`
- TradieFlow sends the configured missed-call template as an SMS, creates or updates a lead, and logs `missed_call_text_back_sent`
- Twilio retries are deduped by a database-backed `CallSid` claim before another text-back can be sent
- Existing leads marked `sms_do_not_contact = true` are suppressed and logged as `missed_call_text_back_suppressed`

## 4. Set Up Your Business Profile

In `/dashboard/settings`, configure:

- Business Name
- Booking URL slug
- Reply-To Email
- Google Review URL if needed
- Service area postcodes
- Default job types

The public lead capture URL is:

`/book/[booking_url_slug]`

## 5. How the Automation Works

### Lead Flow

1. A lead submits the public form at `/book/[booking_url_slug]`
2. `/api/leads/create` validates the payload, checks the honeypot, rate limits by IP, and inserts the lead
3. The lead is stored with `followup_step = 0` and `next_followup_at = now()`
4. Either Supabase Cron calls `public.invoke_lead_followup()` or GitHub Actions calls `/api/cron/leads-followup`
5. The worker claims due leads, sends the correct email, updates the lead, and logs a `lead_events` record

### Follow-Up Sequence

- Step 0: immediate confirmation
- Step 1: 24-hour follow-up
- Step 2: 48-hour follow-up
- After step 2 with no response: lead becomes `stale`

### Convert to Job

From `/dashboard/leads`:

1. Mark lead as `booked`
2. Convert the lead to a job
3. TradieFlow creates or reuses a client, creates a job, and marks the lead as `won`

## 6. Local Testing

Start the app:

```bash
npm run dev
```

Visit a real booking page:

```text
http://localhost:3000/book/your-booking-slug
```

Serve the Edge Function locally if needed:

```bash
npx supabase functions serve lead-followup --no-verify-jwt
```

Use the smoke test script:

```powershell
npm run preflight:production
Copy-Item .env.production.local.example .env.production.local
npm run preflight:production:strict
npm run release:gate:strict
.\scripts\smoke-test.ps1 -BookingUrlSlug your-booking-slug
```

Production-style smoke test with the Zero-Leak dispatcher probe:

```powershell
.\scripts\smoke-test.ps1 -AppBaseUrl https://your-app-host -BookingUrlSlug your-booking-slug -RunZeroLeak
```

## 7. Monitoring

Check recent lead events:

```sql
select *
from lead_events
where created_at > now() - interval '24 hours'
order by created_at desc;
```

Check pending follow-ups:

```sql
select id, name, email, status, followup_step, next_followup_at
from leads
where next_followup_at <= now()
  and status in ('new', 'contacted');
```

Check cron execution:

- `cron.job`
- `cron.job_run_details`
- Supabase Edge Function logs
- Resend delivery logs

## 8. Troubleshooting

### Leads not appearing

1. Verify a `business_profile` exists
2. Verify the booking slug is correct
3. Verify Upstash env vars are set
4. Check app logs for `/api/leads/create`

### Emails not sending

1. Verify `RESEND_API_KEY`
2. Verify `RESEND_SENDER_EMAIL` or `RESEND_FROM_EMAIL`
3. Verify `RESEND_REPLY_TO_EMAIL`
4. Check `lead_events` for `error` records

### Cron not running

1. Verify Vault secrets exist
2. Verify the Edge Function is deployed
3. Verify `configure_lead_followup_cron()` ran successfully
4. Check `cron.job_run_details`
5. Test `select public.invoke_lead_followup();`
6. If using GitHub Actions fallback, verify the workflow secret matches the app-host secret and the workflow can authenticate successfully

## 9. Production Validation

Before calling rollout complete:

- run the browser upload hardening check
- run the full production smoke test with `-RunZeroLeak`
- verify Stripe billing flows end to end
- verify RLS and tenant isolation in the live database
