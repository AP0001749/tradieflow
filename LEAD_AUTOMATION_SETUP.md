# Lead Automation System Setup Guide

## Overview

TradieFlow's lead automation flow is now:

`Public booking page -> /api/leads/create -> leads + lead_events -> Supabase Cron -> Edge Function -> Resend`

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
LEAD_FOLLOWUP_SECRET=your-random-secure-followup-secret
```

Notes:

- `NEXT_PUBLIC_APP_URL` is required for auth redirects and email links.
- Lead capture intentionally fails closed if Upstash is missing.
- Email sending now fails fast if no verified sender is configured.

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
4. Supabase Cron calls `public.invoke_lead_followup()`
5. The Edge Function claims due leads, sends the correct email, updates the lead, and logs a `lead_events` record

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
.\scripts\smoke-test.ps1 -BookingUrlSlug your-booking-slug
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

## 9. Production Validation

Before calling rollout complete:

- run the browser upload hardening check
- run the full production smoke test
- verify Stripe billing flows end to end
- verify RLS and tenant isolation in the live database
