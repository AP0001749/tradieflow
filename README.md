# TradieFlow

TradieFlow is a SaaS job management and lead recovery platform for Australian tradies. It combines a public booking flow, tenant-safe lead capture, client and job management, invoicing, Stripe billing, and automated follow-up for high-urgency trades such as HVAC, plumbing, and electrical.

## Status

The codebase hardening work is done and pushed.

Completed in the repo:

- tenant-safe lead routing using `business_profile.booking_url_slug`
- anti-spam protection with Zod validation, honeypot, and Upstash rate limiting
- Stripe webhook dedupe with retry-safe processing
- atomic free-tier quota enforcement through database RPCs
- Baseline/Apex billing state persisted via `profiles.subscription_plan_key`
- workspace-level Zero-Leak automation settings stored on `business_profile`
- Baseline/Apex feature enforcement for Zero-Leak automation tiers, including Baseline missed-call recovery and Apex-only quote nurture/review extraction
- workspace primary trade focus stored on `business_profile`
- dispatch profile fields stored on `business_profile` for team size, after-hours coverage, and dispatch radius
- workspace dispatch roster stored on `business_profile` for reusable crew assignment shortcuts
- job-level dispatch fields for priority, service window, and assigned tech or crew
- job-level dispatch run order for day-sheet and route-pack sequencing
- manual crew check-in status, ETA note, and last-known-location logging on jobs
- quote and review automation milestones tracked on jobs and invoices
- Zero-Leak quote/review email dispatcher at `/api/cron/zero-leak`
- emergency-trade default templates for quote nurture and post-payment review extraction
- quote/review SMS templates include STOP opt-out copy and the dispatcher falls back to email when a converted lead has SMS suppressed
- Twilio missed-call text-back voice workflow at `/api/twilio/voice`
- missed-call text-back retry dedupe by database-backed Twilio `CallSid` claims
- missed-call recovery that escalates matched leads into emergency triage and logs the escalation event
- repeat missed calls from closed contacts create a fresh active emergency lead instead of hiding inside won/lost/stale history
- emergency triage fields on leads for urgency, response SLA, failure mode, and safety/access risk
- triage-priority lead sorting with quick call, SMS, and email response shortcuts that stamp operator contact
- inbound wrong-number SMS replies automatically suppress future automated SMS and log the suppression event
- operator triage reclassification from lead detail with timeline logging and SLA recalculation
- dashboard emergency lead queue showing active response-risk leads before dispatch work
- response SLA outcome badges showing pending, overdue, hit, or missed contact targets
- immutable first-response timestamp for stable SLA scoring even after later follow-ups
- lead response SLA performance summary with hit rate, overdue count, and average first response
- workspace-configurable response SLA minutes for emergency, same-day, scheduled, and quote leads
- dashboard go-live checklist that turns workspace settings, lead flow, and job activity into an operator rollout sequence
- compliant dispatch-audit outreach kit with copy blocks, audit-link handoff, readiness checks, and MRR projection
- dedicated dispatch desk with quick crew assignment, priority, window, and status controls
- dispatch route packs with Google Maps links and stop-copy handoff for crew/day filters
- dispatch run-order controls carried through the queue, route pack, and printable day sheet
- manual field check-in controls across Dispatch, the board, crew loadboard, and job detail view
- tokenized technician field check-in links with optional browser GPS capture, pause/resume, and rotation controls
- dispatch event timeline for operator updates, field check-ins, and crew-link lifecycle changes
- crew loadboard showing active work by assigned technician or crew
- dispatch brief copy and call/email shortcuts on the dispatch desk and job detail view
- print-ready dispatch day sheet filtered by crew and date
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
- schedule or manually invoke `/api/cron/zero-leak` after applying the Zero-Leak dispatch migration
- configure the Twilio voice webhook and business routing numbers before enabling missed-call text back
- run the browser-based upload hardening check
- run the final production smoke test with `.\scripts\smoke-test.ps1 -AppBaseUrl https://your-app-host -BookingUrlSlug your-booking-slug -RunZeroLeak`

## Core Features

- Dashboard for clients, jobs, invoices, and leads
- Dedicated Dispatch page for crew assignment and run-sheet controls
- Crew loadboard on Dispatch and Dashboard for crew-level workload visibility
- Dispatch brief handoff pack with copy, call, and email actions
- Dispatch day sheet with crew/date filters and print-friendly run sheet output
- Technician field check-in page at `/field/[token]` for mobile status, ETA, location note, and optional GPS updates, with operator-controlled link pause/resume/rotation
- Job-level dispatch timeline preserving field/operator check-in history instead of only the latest snapshot
- Go-live checklist for public lead link, service footprint, missed-call recovery, and first pipeline milestones
- Dispatch profile snapshot for team size, after-hours coverage, radius, and service footprint
- Dispatch board and dashboard snapshot for urgent callouts, today's run sheet, upcoming work, and unassigned jobs
- Dispatch roster presets pushed from Settings into the dispatch desk and job forms
- Lead detail dispatch-audit snapshot sourced from structured intake metadata with notes fallback
- Lead emergency triage board with response SLA visibility and overdue markers
- Lead table/detail quick response actions for phone, SMS triage, and email follow-up with automatic contact logging
- Lead detail triage control for changing response lane, failure mode, and safety/access risk after customer replies
- Main dashboard emergency lead queue with overdue counts and direct response shortcuts
- Lead SLA outcome visibility across dashboard queue, leads table, and lead detail
- First-response SLA scoring that does not drift when later calls, texts, or emails update the lead
- Leads page response performance summary for SLA hit rate, open response risk, and average first response
- Settings controls for emergency, same-day, scheduled, and quote response SLA targets
- Outreach page for compliant dispatch-audit scripts, booking-link handoff, readiness checks, and Baseline/Apex MRR projection
- Trade-specific job ops fields for vertical, warranty, equipment, and site access across create/edit/detail flows
- Job-level revenue handoff view with invoice status and job-prefilled invoice creation path
- Public booking pages at `/book/[booking_url_slug]`
- Multi-tenant lead capture and follow-up sequencing
- Trade-ready public funnel with primary trade focus, service-type presets, and Baseline/Apex positioning
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

- Node.js 20.9+; Node 22 LTS is recommended for CI and production parity
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
For deployment checks, copy `.env.production.local.example` to `.env.production.local`
and replace every placeholder with the hosted production value before running the
strict preflight.

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
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_SKIP_SIGNATURE_VALIDATION=false
```

`RESEND_SENDER_EMAIL` or `RESEND_FROM_EMAIL` must be a verified sender. The app and Edge Function now fail fast if no sender identity is configured.
The compatibility route accepts both `LEAD_FOLLOWUP_SECRET` and the legacy `CRON_SECRET`. You can also supply a comma-separated allowlist during secret rotation.
`TWILIO_SKIP_SIGNATURE_VALIDATION` is for local webhook testing only; keep it disabled in production.

Billing:

```bash
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
NEXT_PUBLIC_STRIPE_BASELINE_PRICE_ID=
NEXT_PUBLIC_STRIPE_APEX_PRICE_ID=
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
- `supabase/migrations/20260401064500_add_zero_leak_automation_settings.sql`
- `supabase/migrations/20260401061000_add_subscription_plan_key.sql`
- `supabase/migrations/20260401073000_add_automation_tracking_fields.sql`
- `supabase/migrations/20260407090000_add_zero_leak_dispatch_claims.sql`
- `supabase/migrations/20260407103000_add_missed_call_text_back_routing.sql`
- `supabase/migrations/20260408100000_add_missed_call_textback_claims.sql`
- `supabase/migrations/20260408113000_add_dispatch_profile_fields.sql`
- `supabase/migrations/20260409103000_add_job_dispatch_fields.sql`
- `supabase/migrations/20260409114500_add_dispatch_roster_to_business_profile.sql`
- `supabase/migrations/20260410083000_expand_public_booking_profile_job_types.sql`
- `supabase/migrations/20260410101500_add_primary_trade_focus_to_business_profile.sql`
- `supabase/migrations/20260410114500_add_job_dispatch_sequence.sql`
- `supabase/migrations/20260410131500_add_job_dispatch_check_in_fields.sql`
- `supabase/migrations/20260411100000_add_field_check_in_links_to_jobs.sql`
- `supabase/migrations/20260411113000_add_job_dispatch_events.sql`
- `supabase/migrations/20260411124500_add_lead_emergency_triage.sql`
- `supabase/migrations/20260411133000_add_lead_first_response_at.sql`
- `supabase/migrations/20260411143000_add_business_lead_response_slas.sql`
- `supabase/migrations/20260411153000_update_zero_leak_emergency_trade_templates.sql`
- `supabase/migrations/20260411160000_add_sms_opt_out_to_zero_leak_templates.sql`
- `supabase/migrations/20260411163000_gate_zero_leak_apex_automations.sql`
- `supabase/migrations/20260411164500_gate_missed_call_baseline_automation.sql`
- `supabase/migrations/20260408124500_expand_create_job_with_trade_fields.sql`
- `supabase/migrations/20260409091500_expand_zero_leak_sms_channels.sql`

The compatibility route exists so follow-up automation can still run while hosted Supabase Cron or the Edge Function rollout catches up. Prefer `POST /api/cron/leads-followup`. The route also accepts `GET` for compatibility, and it honors either `Authorization: Bearer <secret>` or `x-cron-secret: <secret>` across both configured secret names during cutover.

Zero-Leak quote nurture and review extraction can be dispatched by `POST /api/cron/zero-leak`. It uses the same `LEAD_FOLLOWUP_SECRET`/`CRON_SECRET` auth headers, claims due jobs and invoices via database RPCs, prefers Twilio SMS when the workspace has a configured number and the client has a mobile, falls back to Resend email when SMS is unavailable, and releases failed claims with `*_last_error` fields for operator visibility. Missed-call text back is handled by Twilio Voice at `POST /api/twilio/voice`, escalates matched leads into the emergency response lane, and inbound SMS replies are scoped by the receiving Twilio number before matching an existing lead, with Twilio retry dedupe based on the latest inbound `MessageSid`.

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
- `supabase/migrations/20260401064500_add_zero_leak_automation_settings.sql`
- `supabase/migrations/20260401061000_add_subscription_plan_key.sql`
- `supabase/migrations/20260401073000_add_automation_tracking_fields.sql`
- `supabase/migrations/20260407090000_add_zero_leak_dispatch_claims.sql`
- `supabase/migrations/20260407103000_add_missed_call_text_back_routing.sql`
- `supabase/migrations/20260408100000_add_missed_call_textback_claims.sql`
- `supabase/migrations/20260408113000_add_dispatch_profile_fields.sql`
- `supabase/migrations/20260409103000_add_job_dispatch_fields.sql`
- `supabase/migrations/20260409114500_add_dispatch_roster_to_business_profile.sql`
- `supabase/migrations/20260410083000_expand_public_booking_profile_job_types.sql`
- `supabase/migrations/20260410101500_add_primary_trade_focus_to_business_profile.sql`
- `supabase/migrations/20260410114500_add_job_dispatch_sequence.sql`
- `supabase/migrations/20260410131500_add_job_dispatch_check_in_fields.sql`
- `supabase/migrations/20260411100000_add_field_check_in_links_to_jobs.sql`
- `supabase/migrations/20260411113000_add_job_dispatch_events.sql`
- `supabase/migrations/20260411124500_add_lead_emergency_triage.sql`
- `supabase/migrations/20260411133000_add_lead_first_response_at.sql`
- `supabase/migrations/20260411143000_add_business_lead_response_slas.sql`
- `supabase/migrations/20260411153000_update_zero_leak_emergency_trade_templates.sql`
- `supabase/migrations/20260411160000_add_sms_opt_out_to_zero_leak_templates.sql`
- `supabase/migrations/20260411163000_gate_zero_leak_apex_automations.sql`
- `supabase/migrations/20260411164500_gate_missed_call_baseline_automation.sql`
- `supabase/migrations/20260408124500_expand_create_job_with_trade_fields.sql`
- `supabase/migrations/20260409091500_expand_zero_leak_sms_channels.sql`

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
  The workflow will try both `LEAD_FOLLOWUP_SECRET` and legacy `CRON_SECRET` if both repo secrets are configured.

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
- production smoke test after deploy with `-RunZeroLeak`

## Useful Commands

Lint:

```bash
npm run lint
```

Typecheck:

```bash
npm run typecheck
```

Local release verification:

```powershell
npm run verify:local
npm run release:gate
```

CI release verification:

GitHub Actions runs `npm run release:gate` on Windows with Node 22 for pushes,
pull requests, and manual dispatch via `.github/workflows/release-gate.yml`.

HVAC/Apex pivot regression audit:

```powershell
npm run audit:pivot
```

Production build:

```bash
npm run build
```

Production preflight:

```powershell
npm run preflight:production
.\scripts\production-preflight.ps1
Copy-Item .env.production.local.example .env.production.local
npm run preflight:production:strict
npm run release:gate:strict
```

Live follow-up route probe:

```powershell
.\scripts\check-followup-route.ps1
.\scripts\check-followup-route.ps1 -WithAuth
```

Full app smoke test:

```powershell
.\scripts\smoke-test.ps1 -BookingUrlSlug your-booking-slug
.\scripts\smoke-test.ps1 -AppBaseUrl https://your-app-host -BookingUrlSlug your-booking-slug -RunZeroLeak
```

Zero-Leak dispatcher probe:

```powershell
$headers = @{ Authorization = "Bearer $env:LEAD_FOLLOWUP_SECRET"; "x-cron-secret" = $env:LEAD_FOLLOWUP_SECRET }
Invoke-RestMethod -Method Post -Uri "$env:NEXT_PUBLIC_APP_URL/api/cron/zero-leak" -Headers $headers
```

## Deployment Notes

- Vercel remains the app host
- Vercel cron is removed
- Stripe webhook stays on `/api/stripe/webhook`
- Supabase Cron is the target scheduled follow-up path
- GitHub Actions can temporarily drive `/api/cron/leads-followup` as a hosted compatibility fallback
- `/api/cron/zero-leak` needs a scheduler invocation once the dispatch claim migration is live

## Additional Docs

- `LEAD_AUTOMATION_SETUP.md`
- `DEPLOYMENT_CHECKLIST.md`
- `ENHANCED_CONVERSIONS_SETUP.md`
