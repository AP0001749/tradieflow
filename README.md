# TradieFlow

TradieFlow is a SaaS lead-recovery, dispatch, and job-operations platform for Australian trade businesses. It is built for high-urgency trades such as HVAC, plumbing, electrical, heating, cooling, and emergency callout teams.

The core product is a Zero-Leak workflow: capture urgent leads, recover missed calls, follow up quotes, request reviews, and keep dispatch teams moving without leaking revenue to the next tradie on Google.

## What It Does

| Area | Description | Key files |
| --- | --- | --- |
| Lead capture | Public booking/audit funnel with urgency triage, SLA tracking, and rate limiting | `src/app/book`, `src/app/api/leads/create`, `src/lib/lead-triage.ts` |
| Missed-call recovery | Twilio voice flow rings the tradie, then sends a configurable SMS when the call is missed | `src/app/api/twilio/voice`, `src/app/api/twilio/missed-call` |
| Quote nurture | Follows up quoted jobs after a configured delay for Apex workspaces | `src/app/api/cron/zero-leak`, `src/lib/zero-leak.ts` |
| Review extraction | Sends Google review requests after paid invoices for Apex workspaces | `src/app/api/cron/zero-leak`, `src/lib/zero-leak.ts` |
| Dispatch operations | Crew loadboard, route planning, day sheets, priorities, and field status tracking | `src/app/dashboard/dispatch`, `src/lib/dispatch-*.ts` |
| Field check-in | Tokenized technician check-in links with ETA, notes, status, and optional GPS | `src/app/field/[token]`, `src/lib/dispatch-check-in.ts` |

## Plans

| Plan | Price | Includes |
| --- | ---: | --- |
| Free | `$0 AUD` | Core workspace only |
| Baseline | `$299 AUD/month` | Missed-call text-back and standard SMS routing |
| Apex | `$499 AUD/month` | Baseline plus quote nurture and review extraction |

Plan logic and feature gates live in `src/lib/pricing.ts`.

## Tech Stack

- Next.js 16 App Router, React 19, TypeScript
- Supabase Auth, Postgres, Storage, Edge Functions, Vault, and migrations
- Stripe checkout, billing portal, and webhooks
- Twilio voice and SMS
- Resend transactional email
- Upstash Redis rate limiting
- Tailwind CSS, Radix UI, Lucide icons, Recharts, Sonner
- GitHub Actions release gate on Windows with Node 22
- Google Analytics and Google Ads enhanced conversion utilities

## Requirements

- Node.js `>=20.9.0`; Node 22 LTS is recommended
- Supabase project
- Stripe account
- Twilio account with an owned phone number
- Resend account with a verified sender
- Upstash Redis database
- Supabase CLI for database types, migrations, and Edge Function deployment

## Local Setup

Install dependencies:

```bash
npm install
```

Create your local environment file:

```powershell
Copy-Item .env.local.example .env.local
```

Fill in the values required for the flow you want to test, then start the app:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Environment Variables

Environment templates are provided in:

- `.env.local.example`
- `.env.production.local.example`

Core app:

```bash
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Lead automation, email, and rate limiting:

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

Stripe:

```bash
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
NEXT_PUBLIC_STRIPE_BASELINE_PRICE_ID=
NEXT_PUBLIC_STRIPE_APEX_PRICE_ID=
NEXT_PUBLIC_STRIPE_PRO_PRICE_ID=
```

Twilio:

```bash
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
TWILIO_SKIP_SIGNATURE_VALIDATION=false
```

Optional demo login (server-only; never use a `NEXT_PUBLIC_` prefix):

```bash
DEMO_LOGIN_EMAIL=
DEMO_LOGIN_PASSWORD=
```

Optional Google Ads:

```bash
NEXT_PUBLIC_GOOGLE_ADS_LEAD_LABEL=
NEXT_PUBLIC_GOOGLE_ADS_SUBSCRIBE_LABEL=
```

Never commit `.env.local` or `.env.production.local`.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local Next.js dev server |
| `npm run build` | Build the production app |
| `npm run start` | Start the production build |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript without emitting files |
| `npm run audit:pivot` | Check product positioning and safety guardrails |
| `npm run verify:local` | Run lint, typecheck, pivot audit, and build |
| `npm run preflight:production` | Check local production readiness inputs |
| `npm run preflight:production:strict` | Strict production preflight against `.env.production.local` |
| `npm run release:gate` | Run the release gate script |
| `npm run release:gate:strict` | Run release gate with strict production checks |
| `npm run generate-types` | Regenerate Supabase database types |

## Verification

Before repo-side work is considered ready:

```powershell
npm run release:gate
```

After dependency changes, also run:

```powershell
npm audit
npm audit --omit=dev
```

After production variables are available:

```powershell
npm run preflight:production:strict
npm run release:gate:strict
```

## Route Map

### Public Routes

| Route | Purpose |
| --- | --- |
| `/` | Marketing page with Zero-Leak positioning and MRR simulator |
| `/book` | Explains that booking/audit URLs are business-specific |
| `/book/[slug]` | Public lead capture for a workspace |
| `/field/[token]` | Technician field check-in |
| `/login` | Login |
| `/signup` | Signup |
| `/welcome` | First-run onboarding |
| `/forgot-password` | Password reset |
| `/legal/privacy` | Privacy policy |
| `/legal/terms` | Terms |

### Dashboard Routes

| Route | Purpose |
| --- | --- |
| `/dashboard` | Operator dashboard, emergency queue, checklist, and Zero-Leak queue |
| `/dashboard/billing` | Baseline/Apex checkout and billing portal |
| `/dashboard/clients` | Client management |
| `/dashboard/dispatch` | Dispatch desk, route packs, crew loadboard, and day sheet |
| `/dashboard/invoices` | Invoice list |
| `/dashboard/invoices/[id]` | Invoice detail, print, and email actions |
| `/dashboard/jobs` | Jobs board and dispatch snapshot |
| `/dashboard/jobs/[id]` | Job detail, dispatch timeline, and field link controls |
| `/dashboard/leads` | Leads table, channel summary, and SLA summary |
| `/dashboard/leads/[id]` | Lead detail, activity feed, response actions, and triage |
| `/dashboard/outreach` | Compliant manual dispatch-audit outreach kit |
| `/dashboard/settings` | Business profile, service area, automations, Twilio, and SLAs |

### API Routes

| Route | Purpose |
| --- | --- |
| `POST /api/leads/create` | Public lead intake with validation and rate limiting |
| `POST /api/cron/zero-leak` | Quote nurture and review extraction dispatcher |
| `POST /api/prospects/create` | Public dispatch-audit enquiry intake |
| `POST /api/twilio/voice` | Twilio voice entrypoint for missed-call forwarding |
| `POST /api/twilio/missed-call` | Missed-call text-back handler |
| `POST /api/twilio/webhook` | Inbound SMS, STOP, and wrong-number suppression |
| `POST /api/field/check-in` | Technician check-in submission |
| `POST /api/stripe/checkout` | Stripe checkout session |
| `POST /api/stripe/portal` | Stripe billing portal session |
| `POST /api/stripe/webhook` | Stripe webhook processing |
| `/invoice/[token]` | Customer-facing invoice view |

## Main Workflows

### Public Lead Capture

1. Customer opens `/book/[slug]`.
2. Form submits to `POST /api/leads/create`.
3. Zod validation, honeypot, tenant lookup, and Upstash rate limiting protect intake.
4. Triage fields are stored and confirmation email is sent through Resend.
5. Lead appears in `/dashboard/leads` and emergency queues when urgent.

### Missed-Call Text-Back

1. Twilio calls `POST /api/twilio/voice`.
2. The tradie or dispatcher number rings for a short window.
3. If unanswered, Twilio calls `POST /api/twilio/missed-call`.
4. `CallSid` is claimed to prevent duplicate sends.
5. Baseline and Apex workspaces send the configured missed-call SMS.
6. Caller details are recorded as a lead where possible.

### Inbound SMS

1. Twilio calls `POST /api/twilio/webhook`.
2. Messages are matched by receiving Twilio number and sender.
3. STOP replies suppress future automated SMS.
4. Wrong-number replies also suppress future automated SMS.
5. Suppression and replies are logged to the lead activity feed.

### Quote Nurture and Review Extraction

1. Operator sends a quote or marks an invoice paid.
2. Due jobs and invoices are claimed by `POST /api/cron/zero-leak`.
3. Apex access is required.
4. Twilio SMS is preferred when available and not suppressed; Resend email is used as fallback.
5. Errors are released back to the queue with visible last-error fields.

### Dispatch and Field Check-In

1. Operator creates a job with trade and dispatch metadata.
2. Dispatch page shows crew assignment, priority, route, and day sheet.
3. Job detail exposes a tokenized field check-in link.
4. Technician submits status, ETA, location note, and optional GPS from `/field/[token]`.
5. Job snapshot and `job_dispatch_events` timeline update.
6. Operators can pause, resume, or rotate the field link.

## Database and Supabase

Migrations live in `supabase/migrations`.

Important tables include:

| Table | Purpose |
| --- | --- |
| `profiles` | Subscription plan key and Stripe subscription state |
| `business_profile` | Booking slug, trade focus, Twilio routing, dispatch config, automations, and SLAs |
| `leads` | Triage, response SLA, SMS suppression, and first-response tracking |
| `lead_events` | Lead activity log |
| `clients` | Customer records |
| `jobs` | Trade metadata, dispatch metadata, check-in state, and quote follow-up state |
| `job_dispatch_events` | Dispatch and field check-in timeline |
| `invoices` | Invoice state and review extraction state |
| `twilio_missed_call_textbacks` | Missed-call claim and dedupe records |
| `tier_limits` | Plan capabilities and quotas |

Apply migrations:

```bash
npx supabase db push -p <db-password>
```

Regenerate database types after schema changes:

```bash
npm run generate-types
```

## Supabase Edge Functions

Edge Functions live in `supabase/functions`:

| Function | Purpose |
| --- | --- |
| `lead-followup` | Scheduled lead follow-up processor |
| `zero-leak` | Zero-Leak automation processor |
| `dlq-retry` | Dead-letter queue retry handler |

Deploy all required functions:

```bash
npx supabase functions deploy lead-followup --no-verify-jwt
npx supabase functions deploy zero-leak --no-verify-jwt
npx supabase functions deploy dlq-retry --no-verify-jwt
```

Set required secrets:

```bash
npx supabase secrets set `
  LEAD_FOLLOWUP_SECRET=your-secret `
  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key `
  RESEND_API_KEY=your-resend-key `
  RESEND_SENDER_EMAIL=your-verified-sender `
  RESEND_REPLY_TO_EMAIL=your-reply-to-email `
  TWILIO_ACCOUNT_SID=your-twilio-account-sid `
  TWILIO_AUTH_TOKEN=your-twilio-auth-token
```

If Vault secrets already exist, schedule Zero-Leak:

```sql
select public.configure_zero_leak_cron();
```

The GitHub Actions heartbeat workflow invokes:

```text
https://<project-ref>.supabase.co/functions/v1/lead-followup
```

## CI

| Workflow | Trigger | Purpose |
| --- | --- | --- |
| `.github/workflows/release-gate.yml` | Push to `main`, PR, manual run | Installs dependencies and runs `npm run release:gate` on Windows with Node 22 |
| `.github/workflows/heartbeat.yaml` | Every 30 minutes, manual run | Invokes the `lead-followup` Supabase Edge Function |

## Production Deployment

1. Run the local release gate.

```powershell
npm run release:gate
```

2. Create and fill the production environment file.

```powershell
Copy-Item .env.production.local.example .env.production.local
```

3. Run strict production checks.

```powershell
npm run preflight:production:strict
npm run release:gate:strict
```

4. Deploy the latest `main` branch to the app host.
5. Apply Supabase migrations.
6. Deploy Supabase Edge Functions and set secrets.
7. Configure Stripe webhook:

```text
POST https://your-app-host/api/stripe/webhook
```

8. Configure Twilio webhooks:

```text
Voice URL: POST https://your-app-host/api/twilio/voice
SMS URL:   POST https://your-app-host/api/twilio/webhook
```

9. Run a smoke test.

```powershell
.\scripts\smoke-test.ps1 -AppBaseUrl https://your-app-host -BookingUrlSlug your-slug -RunZeroLeak
```

See `DEPLOYMENT_CHECKLIST.md` for the full rollout checklist.

## Smoke and Probe Scripts

Local smoke test:

```powershell
.\scripts\smoke-test.ps1 -BookingUrlSlug your-booking-slug
```

Production smoke test:

```powershell
.\scripts\smoke-test.ps1 -AppBaseUrl https://your-app-host -BookingUrlSlug your-booking-slug -RunZeroLeak
```

Follow-up Edge Function probe:

```powershell
.\scripts\check-followup-route.ps1
.\scripts\check-followup-route.ps1 -WithAuth
```

Zero-Leak dispatcher probe:

```powershell
$headers = @{ Authorization = "Bearer $env:LEAD_FOLLOWUP_SECRET"; "x-cron-secret" = $env:LEAD_FOLLOWUP_SECRET }
Invoke-RestMethod -Method Post -Uri "$env:NEXT_PUBLIC_APP_URL/api/cron/zero-leak" -Headers $headers
```

## Project Structure

| Path | Purpose |
| --- | --- |
| `src/app` | Next.js App Router pages and route handlers |
| `src/app/api` | API routes for leads, Stripe, Twilio, cron, and field check-ins |
| `src/app/dashboard` | Authenticated operator workspace |
| `src/app/book` | Public booking and dispatch-audit funnel |
| `src/app/field` | Public technician check-in flow |
| `src/components/dashboard` | Dashboard UI components |
| `src/components/marketing` | Homepage marketing components |
| `src/components/ui` | Shared UI primitives |
| `src/emails` | React Email templates |
| `src/lib` | Business logic helpers and domain rules |
| `src/lib/supabase` | Supabase client factories |
| `src/types` | App types and generated database types |
| `src/utils` | Analytics and conversion utilities |
| `supabase/migrations` | Database migrations |
| `supabase/functions` | Supabase Edge Functions |
| `scripts` | Release, preflight, smoke, and probe scripts |
| `.github/workflows` | CI and heartbeat workflows |

## Safety and Compliance

TradieFlow includes compliant manual outreach assets. It must not be used to automate spam.

- Do not scrape phone lists.
- Do not bulk-send SMS to scraped numbers.
- Do not bulk-submit website contact forms.
- Do not bypass opt-outs or wrong-number suppression.
- Keep `TWILIO_SKIP_SIGNATURE_VALIDATION=false` in production.
- Keep STOP opt-out copy in automated SMS templates.
- Use `/dashboard/outreach` for reviewed, identifiable dispatch-audit outreach only.

The `npm run audit:pivot` script checks that the repository has not drifted toward legacy low-urgency copy, low-tier convenience positioning, or unsafe outbound language.

## Notes for AI Agents

Read these before changing major behavior:

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

Working rules:

- Run `npm run release:gate` before declaring repo-side work complete.
- Run `npm audit` and `npm audit --omit=dev` after dependency changes.
- Do not commit `.env.local` or `.env.production.local`.
- Do not remove migrations unless explicitly asked.
- Do not reintroduce low-urgency service-market positioning.
- Do not implement scraping, bulk SMS, or website form injection.
- Preserve STOP and wrong-number SMS suppression.
- Preserve plan gates: Baseline for missed-call recovery, Apex for quote nurture and review extraction.
- Preserve tenant isolation and booking slug routing.

## Additional Docs

- `DEPLOYMENT_CHECKLIST.md`
- `LEAD_AUTOMATION_SETUP.md`
- `ENHANCED_CONVERSIONS_SETUP.md`
