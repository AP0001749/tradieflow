# TradieFlow

TradieFlow is a job + client + invoicing system built for Australian tradies. It also includes a public booking/lead capture flow and automated follow-up emails.

## What’s inside

- Jobs, clients, invoices (dashboard)
- Invoice emailing via Resend
- Photos upload support (server actions body size increased)
- Supabase Auth (Google OAuth + email/password) + route protection via middleware
- Stripe subscriptions (checkout, portal, webhook)
- Lead capture endpoint + scheduled lead follow-up emails (Supabase Cron + Edge Function)
- Google Ads conversion tracking + Enhanced Conversions utilities

## Tech stack

- Next.js (App Router) + TypeScript
- React 19
- Supabase (Postgres + Auth)
- Stripe (subscriptions)
- Resend (transactional email)
- Tailwind CSS + shadcn/ui

## Local development (Windows)

### Prerequisites

- Node.js 18.18+ (or newer)
- A Supabase project (URL + anon key)
- Resend API key (for invoice + follow-up emails)
- Stripe account + keys (only required if you’re testing billing)

### Install

```bash
npm install
```

### Environment variables

Next.js reads `.env.local`. This repo also contains an `env.local` file that can be used as a starting point — copy/rename it to `.env.local` and fill in values.

Minimum to run the app:

```bash
# Supabase (client)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

To enable email features:

```bash
RESEND_API_KEY=

# Optional defaults used in lead flows
RESEND_FROM_EMAIL=
DEFAULT_BUSINESS_NAME=TradieFlow
```

To enable Stripe billing:

```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Single Pro price used by the billing page
NEXT_PUBLIC_STRIPE_PRO_PRICE_ID=
```

To enable public lead capture (server-side insert bypassing RLS):

```bash
SUPABASE_SERVICE_ROLE_KEY=
```

To enable the scheduled lead follow-up scheduler:

```bash
CRON_SECRET=
LEAD_FOLLOWUP_SECRET=
```

Supabase Edge Function secrets also need:

```bash
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
RESEND_SENDER_EMAIL=
RESEND_REPLY_TO_EMAIL=
```

Optional (Google Ads):

```bash
# Lead conversion label (Google Ads → Tools → Conversions)
NEXT_PUBLIC_GOOGLE_ADS_LEAD_LABEL=
```

### Run the dev server

```bash
npm run dev
```

Open http://localhost:3000

## Database & migrations (Supabase)

This project includes Supabase migrations in `supabase/migrations/`.

If you use the Supabase CLI:

```bash
npm i -g supabase
supabase link --project-ref <your-project-ref>
supabase db push
```

Generate TypeScript types (writes to `src/types/database.generated.ts`):

```bash
npm run generate-types
```

## Stripe webhooks (local)

Forward Stripe events to the webhook route:

```bash
stripe listen --forward-to http://localhost:3000/api/stripe/webhook
```

## Lead automation (scheduler)

Production lead follow-up now runs through:

- Supabase Cron
- `public.invoke_lead_followup()`
- `supabase/functions/lead-followup`

The legacy Next.js route `GET /api/cron/leads-followup` remains available as a manual fallback.

See:

- `LEAD_AUTOMATION_SETUP.md`

## Google Ads + Enhanced Conversions

Enhanced Conversions helpers live in `src/utils/enhanced-conversions.ts` and `src/utils/gtag.ts`.

Setup details:

- `ENHANCED_CONVERSIONS_SETUP.md`

## Useful docs

- `DEPLOYMENT_CHECKLIST.md`
- `LEAD_AUTOMATION_SETUP.md`
- `ENHANCED_CONVERSIONS_SETUP.md`

## Deployment

Recommended deployment target is Vercel.

- Add all env vars in the Vercel Project Settings
- Update Supabase Auth redirect URLs for your production domain
- Configure Stripe webhook endpoint to `/api/stripe/webhook`
- Configure Supabase Edge Function secrets and Vault secrets before enabling the scheduler

## License

Proprietary / internal use.

## 🎯 Status

**Final Version** - January 26, 2026

This is the production-ready release with all core features implemented:
✅ Authentication & user management
✅ Job, client, and invoice management
✅ Stripe subscription system
✅ Email delivery
✅ Google Ads tracking
✅ Revenue analytics
✅ Responsive design

---

## 📧 Support

For issues or questions, please contact the development team.
