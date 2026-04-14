# TradieFlow

TradieFlow is a SaaS lead-recovery, dispatch, and job-ops platform for Australian trade businesses. The current product focus is high-urgency infrastructure trades: HVAC, plumbing, electrical, heating, cooling, and emergency callout teams.

The product is no longer positioned as generic booking convenience. It is a Zero-Leak workflow for stopping missed calls, cold quotes, and missed review opportunities from leaking revenue to the next tradie on Google.

## Quick Summary

- Public dispatch-audit funnel at `/book/[booking_url_slug]`.
- Missed-call text-back through Twilio voice and SMS webhooks.
- Emergency lead triage with response SLA tracking.
- Quote nurture and Google review extraction through the Zero-Leak cron route.
- Dispatch desk, crew loadboard, route packs, run order, and printable day sheets.
- Technician field check-in links at `/field/[token]` with optional browser GPS capture.
- Baseline and Apex subscription tiers with plan-gated automations.
- Supabase-backed auth, database, storage, migrations, Edge Function, and optional Cron.
- Stripe checkout, billing portal, and webhook processing.
- Resend email automation and Twilio SMS automation.
- Release gates for humans and AI agents: `npm run release:gate`.

## Product Model

### Plans

| Plan | Price | Automation access |
| --- | ---: | --- |
| Free | $0 AUD | Core workspace only |
| Baseline | $299 AUD / month | Missed-call text-back and standard SMS routing |
| Apex | $499 AUD / month | Baseline plus quote nurture, review extraction, and deeper automation |

Plan logic lives in `src/lib/pricing.ts`.

### Zero-Leak Systems

| System | What it does | Main files |
| --- | --- | --- |
| Missed Call Text Back | Twilio rings the tradie for 15 seconds, then texts the caller if the call is missed | `src/app/api/twilio/voice/route.ts`, `src/app/api/twilio/missed-call/route.ts` |
| Quote Nurture | Follows up quoted jobs after the configured delay | `src/app/api/cron/zero-leak/route.ts`, `src/lib/zero-leak.ts` |
| Review Extraction | Sends post-payment Google review requests after the configured delay | `src/app/api/cron/zero-leak/route.ts`, `src/lib/zero-leak.ts` |
| Emergency Triage | Captures urgency, failure mode, risk, and first response SLA | `src/lib/lead-triage.ts`, `src/app/dashboard/leads/[id]/page.tsx` |
| Dispatch Ops | Runs crew assignment, run order, route packs, day sheets, and field check-ins | `src/app/dashboard/dispatch/page.tsx`, `src/app/field/[token]/page.tsx` |

## Safety And Compliance Rules

TradieFlow includes compliant manual outreach assets, but it must not be used to automate spam.

- Do not scrape phone lists.
- Do not bulk-send SMS to scraped numbers.
- Do not bulk-submit website contact forms.
- Do not bypass opt-outs or wrong-number suppression.
- Keep `TWILIO_SKIP_SIGNATURE_VALIDATION=false` in production.
- Keep STOP opt-out copy in automated SMS templates.
- Use `/dashboard/outreach` for reviewed, identifiable dispatch-audit outreach only.

The regression script `npm run audit:pivot` checks that the repo does not drift back toward legacy low-urgency service copy, low-tier convenience positioning, or unsafe outbound language.

## Tech Stack

- Next.js App Router 16
- React 19
- TypeScript
- Supabase Auth, Postgres, Storage, Edge Functions, Vault, and optional Cron
- Stripe checkout, billing portal, and webhooks
- Resend email
- Twilio voice and SMS
- Upstash Redis rate limiting
- Tailwind CSS
- GitHub Actions for release checks and optional follow-up fallback

## Requirements

- Node.js `>=20.9.0`
- Node 22 LTS recommended for CI and production parity
- npm
- Supabase project
- Stripe account
- Resend account and verified sender
- Twilio account and owned number
- Upstash Redis database

## Local Setup

Install dependencies:

```bash
npm install
```

Create a local environment file:

```powershell
Copy-Item .env.local.example .env.local
```

Fill only what you need for local testing. Some flows can be developed without live Twilio, Stripe, or Resend, but production preflight will fail until those values are real.

Run the app:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Environment Variables

Local examples live in `.env.local.example`.

Production examples live in `.env.production.local.example`.

### Core App

```bash
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

### Lead Capture And Automation

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

`LEAD_FOLLOWUP_SECRET` is preferred. `CRON_SECRET` is a legacy alias during cutover.

### Stripe

```bash
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
NEXT_PUBLIC_STRIPE_BASELINE_PRICE_ID=
NEXT_PUBLIC_STRIPE_APEX_PRICE_ID=
NEXT_PUBLIC_STRIPE_PRO_PRICE_ID=
```

`NEXT_PUBLIC_STRIPE_PRO_PRICE_ID` is only a legacy fallback for Baseline during cutover.

### Twilio

```bash
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_SKIP_SIGNATURE_VALIDATION=false
```

### Optional Google Ads

```bash
NEXT_PUBLIC_GOOGLE_ADS_LEAD_LABEL=
NEXT_PUBLIC_GOOGLE_ADS_SUBSCRIBE_LABEL=
```

## Common Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start local Next.js dev server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript with `--noEmit` |
| `npm run build` | Build the production app |
| `npm run audit:pivot` | Check HVAC/Apex positioning and safety guardrails |
| `npm run verify:local` | Run lint, typecheck, pivot audit, and build |
| `npm run preflight:production` | Check local env and repo shape |
| `npm run preflight:production:strict` | Check `.env.production.local` with strict production rules |
| `npm run release:gate` | Parse scripts, run local verifier, run whitespace diff check |
| `npm run release:gate:strict` | Release gate plus required strict production preflight |
| `npm run generate-types` | Regenerate Supabase database types |

## Verification

Before committing or pushing:

```powershell
npm run release:gate
npm audit
npm audit --omit=dev
```

Expected local result before production credentials exist:

```text
Release gate completed without blocking issues.
.env.production.local not found. Skipping strict production preflight until real hosted values are available.
```

Expected production result after filling `.env.production.local`:

```powershell
npm run release:gate:strict
```

That command should pass without warnings for a production-ready deploy.

## CI

GitHub Actions runs the release gate on Windows with Node 22.

Workflow:

```text
.github/workflows/release-gate.yml
```

Triggers:

- Push to `main`
- Pull request
- Manual dispatch

There is also a scheduled follow-up compatibility workflow:

```text
.github/workflows/heartbeat.yaml
```

The heartbeat workflow can call `/api/cron/leads-followup` while Supabase Cron or Edge Function scheduling is being rolled out.

## Route Map

### Public Routes

| Route | Purpose |
| --- | --- |
| `/` | Marketing page with Zero-Leak positioning and MRR simulator |
| `/book` | Explains that booking/audit URLs are business-specific |
| `/book/[slug]` | Public dispatch-audit lead capture for a workspace |
| `/field/[token]` | Technician field check-in page |
| `/login` | Login |
| `/signup` | Signup |
| `/welcome` | First-run onboarding |
| `/legal/privacy` | Privacy policy |
| `/legal/terms` | Terms |

### Dashboard Routes

| Route | Purpose |
| --- | --- |
| `/dashboard` | Main operator dashboard, emergency queue, go-live checklist, Zero-Leak queue |
| `/dashboard/billing` | Baseline/Apex checkout and billing portal |
| `/dashboard/clients` | Client management |
| `/dashboard/dispatch` | Dispatch desk, route packs, crew loadboard, day sheet |
| `/dashboard/invoices` | Invoice list |
| `/dashboard/invoices/[id]` | Invoice detail and print/email actions |
| `/dashboard/jobs` | Jobs board and dispatch snapshot |
| `/dashboard/jobs/[id]` | Job detail, dispatch timeline, field link controls |
| `/dashboard/leads` | Leads table, channel summary, SLA summary, readiness |
| `/dashboard/leads/[id]` | Lead detail, activity feed, response actions, triage control |
| `/dashboard/outreach` | Compliant manual dispatch-audit outreach kit |
| `/dashboard/settings` | Business profile, service area, automations, Twilio, SLAs |

### API Routes

| Route | Purpose |
| --- | --- |
| `POST /api/leads/create` | Public lead intake with validation and rate limiting |
| `POST /api/cron/leads-followup` | Hosted compatibility lead follow-up processor |
| `POST /api/cron/zero-leak` | Quote nurture and review extraction dispatcher |
| `POST /api/twilio/voice` | Twilio voice entrypoint for missed-call forwarding |
| `POST /api/twilio/missed-call` | Missed-call text-back handler |
| `POST /api/twilio/webhook` | Inbound SMS, STOP, wrong-number suppression |
| `POST /api/field/check-in` | Public technician check-in submit endpoint |
| `POST /api/stripe/checkout` | Stripe checkout session |
| `POST /api/stripe/portal` | Stripe billing portal session |
| `POST /api/stripe/webhook` | Stripe webhook processing |

## Main Flows

### Public Dispatch-Audit Lead

1. Customer or business owner opens `/book/[booking_url_slug]`.
2. `BookingRequestForm` submits to `POST /api/leads/create`.
3. Zod validation, honeypot, tenant lookup, and Upstash rate limiting protect intake.
4. Lead triage fields are stored on `leads`.
5. Immediate follow-up email is sent through Resend when configured.
6. Lead appears in `/dashboard/leads` and emergency queues when urgent.

### Missed-Call Text Back

1. Twilio calls `POST /api/twilio/voice`.
2. Tradie/dispatcher number rings for 15 seconds.
3. If unanswered, Twilio calls `POST /api/twilio/missed-call`.
4. TradieFlow claims the `CallSid` to avoid duplicate sends.
5. Baseline or Apex workspace receives the configured missed-call SMS behavior.
6. Caller is created or updated as an emergency lead.
7. Matched closed contacts create a fresh active emergency lead.

### Inbound SMS

1. Twilio calls `POST /api/twilio/webhook`.
2. Messages are matched by receiving Twilio number and sender.
3. STOP replies suppress future automated SMS.
4. Wrong-number replies also suppress future automated SMS.
5. Lead activity logs show the suppression or inbound reply.

### Quote Nurture And Review Extraction

1. Operator sends a quote or marks an invoice paid.
2. Due jobs and invoices are claimed by `POST /api/cron/zero-leak`.
3. Apex plan is required.
4. Twilio SMS is preferred when available and not suppressed.
5. Resend email is used as fallback.
6. Errors are released back to the queue with visible `*_last_error` fields.

### Dispatch And Field Check-In

1. Operator creates or edits a job with trade and dispatch metadata.
2. Dispatch page shows crew assignment, priority, route, and day sheet.
3. Job detail exposes a tokenized field check-in link.
4. Technician submits status, ETA, location note, and optional GPS from `/field/[token]`.
5. Job snapshot and `job_dispatch_events` timeline update.
6. Operators can pause, resume, or rotate the field link.

## Data Model And Migrations

Supabase migrations live in:

```text
supabase/migrations
```

Important schema areas:

- `business_profile`: booking slug, trade focus, dispatch profile, roster, Twilio routing, automation settings, SLA settings.
- `profiles`: subscription plan key and Stripe subscription state.
- `leads`: triage, response SLA, SMS suppression, first response tracking.
- `lead_events`: activity feed for capture, follow-up, response, suppression, and triage events.
- `clients`: customer records created manually or from won leads.
- `jobs`: trade metadata, dispatch metadata, field check-in state, quote follow-up state.
- `job_dispatch_events`: immutable dispatch and field check-in timeline.
- `invoices`: invoice state and review extraction state.
- `twilio_missed_call_textbacks`: missed-call `CallSid` claim/dedupe records.
- `tier_limits`: plan capabilities and quotas.

Apply migrations to a linked Supabase project:

```bash
npx supabase db push -p <db-password>
```

Regenerate types after schema changes:

```bash
npm run generate-types
```

## Supabase Edge Function And Cron

Target production path:

```text
Supabase Cron -> public.invoke_lead_followup() -> lead-followup Edge Function -> Resend + DB updates
```

Compatibility fallback:

```text
GitHub Actions -> /api/cron/leads-followup -> Resend + DB updates
```

Deploy Edge Function:

```bash
npx supabase functions deploy lead-followup --no-verify-jwt
```

Set Edge Function secrets:

```bash
npx supabase secrets set \
  LEAD_FOLLOWUP_SECRET=your-random-secure-followup-secret \
  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
  RESEND_API_KEY=your-resend-api-key \
  RESEND_SENDER_EMAIL=your-verified-sender \
  RESEND_REPLY_TO_EMAIL=your-reply-to-email
```

Create Vault secrets:

```sql
select vault.create_secret('https://YOUR_PROJECT_REF.supabase.co', 'project_url');
select vault.create_secret('YOUR_SUPABASE_ANON_KEY', 'supabase_anon_key');
select vault.create_secret('YOUR_LEAD_FOLLOWUP_SECRET', 'lead_followup_secret');
```

If Vault secrets were created after the scheduler migration:

```sql
select public.configure_lead_followup_cron();
```

## Production Deployment Runbook

1. Run local release gate.

```powershell
npm run release:gate
```

2. Create production env file.

```powershell
Copy-Item .env.production.local.example .env.production.local
```

3. Replace every placeholder in `.env.production.local` with real hosted values.

4. Run strict preflight.

```powershell
npm run preflight:production:strict
npm run release:gate:strict
```

5. Deploy latest `main` to the app host.

6. Apply Supabase migrations.

7. Deploy the `lead-followup` Edge Function and set secrets.

8. Configure Stripe webhook:

```text
POST https://your-app-host/api/stripe/webhook
```

9. Configure Twilio webhooks:

```text
POST https://your-app-host/api/twilio/voice
POST https://your-app-host/api/twilio/webhook
```

10. Run production smoke test.

```powershell
.\scripts\smoke-test.ps1 -AppBaseUrl https://your-app-host -BookingUrlSlug your-booking-slug -RunZeroLeak
```

See `DEPLOYMENT_CHECKLIST.md` for the full deployment checklist.

## Smoke And Probe Scripts

Local or hosted app smoke test:

```powershell
.\scripts\smoke-test.ps1 -BookingUrlSlug your-booking-slug
.\scripts\smoke-test.ps1 -AppBaseUrl https://your-app-host -BookingUrlSlug your-booking-slug -RunZeroLeak
```

Follow-up route probe:

```powershell
.\scripts\check-followup-route.ps1
.\scripts\check-followup-route.ps1 -WithAuth
```

Zero-Leak dispatcher probe:

```powershell
$headers = @{ Authorization = "Bearer $env:LEAD_FOLLOWUP_SECRET"; "x-cron-secret" = $env:LEAD_FOLLOWUP_SECRET }
Invoke-RestMethod -Method Post -Uri "$env:NEXT_PUBLIC_APP_URL/api/cron/zero-leak" -Headers $headers
```

## Project Map

| Path | Purpose |
| --- | --- |
| `src/app` | Next.js App Router pages and route handlers |
| `src/app/api` | Server API routes for leads, Stripe, Twilio, cron, and field check-ins |
| `src/app/dashboard` | Authenticated operator workspace |
| `src/app/book` | Public dispatch-audit funnel |
| `src/app/field` | Public technician field check-in flow |
| `src/components/dashboard` | Dashboard-specific UI components |
| `src/components/marketing` | Homepage marketing components |
| `src/components/ui` | Shared primitive UI components |
| `src/emails` | React Email templates |
| `src/lib` | Business logic helpers and shared domain rules |
| `src/lib/supabase` | Supabase client factories |
| `src/types` | App and generated database types |
| `src/utils` | Analytics utilities |
| `supabase/migrations` | Database migrations |
| `supabase/functions/lead-followup` | Supabase Edge Function |
| `scripts` | Release, preflight, smoke, and probe scripts |
| `.github/workflows` | GitHub Actions release and follow-up workflows |

## Important Files For AI Agents

Read these first when changing major behavior:

- `README.md`
- `DEPLOYMENT_CHECKLIST.md`
- `LEAD_AUTOMATION_SETUP.md`
- `src/lib/pricing.ts`
- `src/lib/zero-leak.ts`
- `src/lib/lead-triage.ts`
- `src/lib/outreach-kit.ts`
- `src/app/api/twilio/missed-call/route.ts`
- `src/app/api/cron/zero-leak/route.ts`
- `src/app/dashboard/settings/actions.ts`
- `supabase/migrations`

## AI Agent Working Rules

- Run `npm run release:gate` before declaring repo-side work complete.
- Run `npm audit` and `npm audit --omit=dev` after dependency changes.
- Do not commit `.env.local` or `.env.production.local`.
- Do not remove migrations unless explicitly asked.
- Do not reintroduce low-urgency service-market positioning.
- Do not implement scraping, bulk SMS, or website form injection.
- Preserve STOP and wrong-number SMS suppression.
- Preserve plan gates: Baseline for missed-call recovery, Apex for quote nurture and review extraction.
- Preserve tenant isolation and booking slug routing.
- Treat `.env.production.local.example` as a placeholder template only.

## Current Production Blockers

Repo-side implementation and local release gates are complete. Production rollout still requires real hosted values and external setup:

- Real Resend API key and verified sender.
- Real Stripe Baseline and Apex price IDs.
- Real Twilio account SID, auth token, phone number, and webhooks.
- Hosted Supabase migrations applied.
- Supabase Vault secrets created.
- `lead-followup` Edge Function deployed.
- Scheduler configured for lead follow-up and Zero-Leak dispatch.
- Production smoke test run against the deployed app.

## Additional Docs

- `DEPLOYMENT_CHECKLIST.md`
- `LEAD_AUTOMATION_SETUP.md`
- `ENHANCED_CONVERSIONS_SETUP.md`
