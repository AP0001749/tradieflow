# TradieFlow

TradieFlow is a SaaS job management and lead follow-up platform for Australian tradies. It combines a public booking flow, tenant-safe lead capture, client and job management, invoicing, Stripe billing, and automated lead follow-up.

## Status

The codebase hardening work is done and pushed.

Completed in the repo:

- tenant-safe lead routing using `business_profile.booking_url_slug`
- anti-spam protection with Zod validation, honeypot, and Upstash rate limiting
- Stripe webhook dedupe with retry-safe processing
- atomic free-tier quota enforcement through database RPCs
- upload validation and signed URL hardening
- middleware fail-closed behavior for protected routes
- Supabase Cron migration path with a Supabase Edge Function for follow-up automation
- compatibility follow-up processor at `/api/cron/leads-followup`
- GitHub Actions fallback scheduler for the compatibility processor
- removal of Vercel cron scheduling

Still required before calling the rollout fully complete:

- apply the Supabase Cron migration in the live project
- deploy the `lead-followup` Edge Function
- set Edge Function secrets in Supabase
- create the required Vault secrets
- verify either the hosted compatibility route or Supabase Cron runs successfully in production
- run the browser-based upload hardening check
- run the final production smoke test

## Core Features

- Dashboard for clients, jobs, invoices, and leads
- Public booking pages at `/book/[booking_url_slug]`
- Multi-tenant lead capture and follow-up sequencing
- Job photo uploads
- Stripe subscriptions and billing portal
- Google Ads conversion tracking
- Supabase-backed auth, database, storage, and scheduled automation

## Tech Stack

- Next.js App Router
- TypeScript
- React 19
- Supabase Auth, Postgres, Storage, Edge Functions, and Cron
- Stripe
- Resend
- Upstash Redis
- Tailwind CSS

## Local Setup

### Prerequisites

- Node.js 18.18+
- npm
- a Supabase project
- Stripe credentials if testing billing
- Resend credentials if testing emails
- Upstash Redis credentials if testing public lead capture rate limiting

### Install

```bash
npm install
```

### Environment

Copy `.env.local.example` to `.env.local` and fill in the values you need.

App runtime:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

`NEXT_PUBLIC_APP_URL` is required for OAuth redirects, Stripe return URLs, and invoice links.

Lead capture and automation:

```bash
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
RESEND_API_KEY=
RESEND_FROM_EMAIL=
RESEND_SENDER_EMAIL=
RESEND_REPLY_TO_EMAIL=
LEAD_FOLLOWUP_SECRET=
CRON_SECRET=
```

`RESEND_SENDER_EMAIL` or `RESEND_FROM_EMAIL` must be a verified sender. The app and Edge Function now fail fast if no sender identity is configured.
The compatibility route accepts both `LEAD_FOLLOWUP_SECRET` and the legacy `CRON_SECRET`. You can also supply a comma-separated allowlist during secret rotation.

Billing:

```bash
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
NEXT_PUBLIC_STRIPE_PRO_PRICE_ID=
```

### Run Locally

```bash
npm run dev
```

Open `http://localhost:3000`.

## Database

Supabase migrations live in `supabase/migrations`.

`supabase/config.toml` is for local Supabase CLI development. Do not treat its auth settings as proof of your hosted production auth policy.

Apply migrations:

```bash
npx supabase db push -p <db-password>
```

Generate fresh database types after schema changes:

```bash
npm run generate-types
```

## Lead Automation Architecture

Target production flow:

`Supabase Cron -> public.invoke_lead_followup() -> Supabase Edge Function -> Resend + DB updates`

Current compatibility fallback:

`GitHub Actions -> /api/cron/leads-followup -> Resend + DB updates`

Relevant files:

- `supabase/functions/lead-followup/index.ts`
- `supabase/migrations/20260324153000_hardening_patch.sql`
- `supabase/migrations/20260324174500_move_lead_followup_to_supabase_cron.sql`
- `supabase/migrations/20260330150000_centralize_tier_limits.sql`

The compatibility route exists so follow-up automation can still run while hosted Supabase Cron or the Edge Function rollout catches up. It accepts either `Authorization: Bearer <secret>` or `x-cron-secret: <secret>`, and it will honor both configured secret names during cutover.

## Supabase Cron Rollout

### 1. Deploy the Edge Function

```bash
npx supabase functions deploy lead-followup --no-verify-jwt
```

### 2. Set Edge Function Secrets

```bash
npx supabase secrets set \
  LEAD_FOLLOWUP_SECRET=your-random-secure-followup-secret \
  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
  RESEND_API_KEY=your-resend-api-key \
  RESEND_SENDER_EMAIL=your-verified-sender \
  RESEND_REPLY_TO_EMAIL=your-reply-to-email
```

### 3. Create Vault Secrets

```sql
select vault.create_secret('https://YOUR_PROJECT_REF.supabase.co', 'project_url');
select vault.create_secret('YOUR_SUPABASE_ANON_KEY', 'supabase_anon_key');
select vault.create_secret('YOUR_LEAD_FOLLOWUP_SECRET', 'lead_followup_secret');
```

### 4. Apply the Scheduler Migration

Apply:

- `supabase/migrations/20260324174500_move_lead_followup_to_supabase_cron.sql`
- `supabase/migrations/20260330150000_centralize_tier_limits.sql`

If the Vault secrets did not exist when the migration ran:

```sql
select public.configure_lead_followup_cron();
```

### 5. Verify the Scheduler

Check:

- `cron.job`
- `cron.job_run_details`
- Supabase Edge Function logs
- Resend send results
- GitHub Actions `TradieFlow Supabase Follow-up Check` if you are still relying on the compatibility route

## Verification

Already verified locally:

- booking slug routing
- payload validation
- honeypot behavior
- rate limiting
- middleware fail-closed behavior
- cron claim/idempotency behavior
- Stripe webhook dedupe and retry safety
- free-tier quota enforcement

Still recommended before production rollout:

- browser-based upload hardening check
- production smoke test after deploy

## Useful Commands

Lint:

```bash
npm run lint
```

Typecheck:

```bash
npx tsc --noEmit
```

Production build:

```bash
npm run build
```

## Deployment Notes

- Vercel remains the app host
- Vercel cron is removed
- Stripe webhook stays on `/api/stripe/webhook`
- Supabase Cron is the target scheduled follow-up path
- GitHub Actions can temporarily drive `/api/cron/leads-followup` as a hosted compatibility fallback

## Additional Docs

- `LEAD_AUTOMATION_SETUP.md`
- `DEPLOYMENT_CHECKLIST.md`
- `ENHANCED_CONVERSIONS_SETUP.md`
