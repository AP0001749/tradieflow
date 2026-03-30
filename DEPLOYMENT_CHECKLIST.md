# TradieFlow Deployment Checklist

## Pre-Deployment

- [ ] Run local verification:
  `npm run lint`
  `npm run build`
  `npx tsc --noEmit`
- [ ] Confirm `.env.local` includes:
  `NEXT_PUBLIC_APP_URL`
  `NEXT_PUBLIC_SUPABASE_URL`
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  `SUPABASE_SERVICE_ROLE_KEY`
  `UPSTASH_REDIS_REST_URL`
  `UPSTASH_REDIS_REST_TOKEN`
  `RESEND_API_KEY`
  `RESEND_SENDER_EMAIL` or `RESEND_FROM_EMAIL`
  `STRIPE_SECRET_KEY`
  `STRIPE_WEBHOOK_SECRET`
  `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
  `NEXT_PUBLIC_STRIPE_PRO_PRICE_ID`
- [ ] Confirm a real `business_profile.booking_url_slug` exists for smoke testing
- [ ] Test the public booking page at `/book/[booking_url_slug]`
- [ ] Verify invoice email rendering locally
- [ ] Verify a business profile exists in `/dashboard/settings`

## Vercel / App Host

- [ ] Deploy the latest `main`
- [ ] Set production env vars:
  `NEXT_PUBLIC_APP_URL`
  `NEXT_PUBLIC_SUPABASE_URL`
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  `SUPABASE_SERVICE_ROLE_KEY`
  `UPSTASH_REDIS_REST_URL`
  `UPSTASH_REDIS_REST_TOKEN`
  `RESEND_API_KEY`
  `RESEND_SENDER_EMAIL` or `RESEND_FROM_EMAIL`
  `RESEND_REPLY_TO_EMAIL`
  `STRIPE_SECRET_KEY`
  `STRIPE_WEBHOOK_SECRET`
  `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
  `NEXT_PUBLIC_STRIPE_PRO_PRICE_ID`
  `LEAD_FOLLOWUP_SECRET` if using `/api/cron/leads-followup`
  `CRON_SECRET` only as a legacy alias during cutover
  `NEXT_PUBLIC_GOOGLE_ADS_LEAD_LABEL` if using lead conversion tracking
  `NEXT_PUBLIC_GOOGLE_ADS_SUBSCRIBE_LABEL` if using subscription conversion tracking
- [ ] Verify `/login`, `/signup`, and `/dashboard` behave correctly after deploy
- [ ] Verify `POST /api/cron/leads-followup` returns an authenticated success response if you are using the hosted compatibility processor
- [ ] If using GitHub Actions fallback scheduling, confirm repo secrets:
  `APP_BASE_URL`
  `LEAD_FOLLOWUP_SECRET` or `CRON_SECRET`
- [ ] Confirm the app-host and GitHub Actions secrets are both present in the route allowlist during cutover
- [ ] If both GitHub secrets exist during cutover, confirm at least one matches the app-host route secret set

## Supabase

- [ ] Apply production migrations, including:
  `20260324174500_move_lead_followup_to_supabase_cron.sql`
  `20260330150000_centralize_tier_limits.sql`
- [ ] Verify hosted Supabase auth settings directly in the live project dashboard
- [ ] Verify RLS / tenant isolation in the live database
- [ ] Confirm `tier_limits` contains the expected free/pro plan rows
- [ ] Create or verify Vault secrets:
  `project_url`
  `supabase_anon_key`
  `lead_followup_secret`
- [ ] Deploy the `lead-followup` Edge Function
- [ ] Set Supabase Edge Function secrets:
  `LEAD_FOLLOWUP_SECRET`
  `SUPABASE_SERVICE_ROLE_KEY`
  `RESEND_API_KEY`
  `RESEND_SENDER_EMAIL` or `RESEND_FROM_EMAIL`
  `RESEND_REPLY_TO_EMAIL`
- [ ] If Vault secrets were added after the migration, run:
  `select public.configure_lead_followup_cron();`
- [ ] Verify `cron.job` and `cron.job_run_details`
- [ ] Verify Supabase Edge Function logs show successful runs
- [ ] Once Supabase Cron is confirmed healthy, disable the GitHub Actions fallback schedule if you no longer need the hosted compatibility route

## Stripe

- [ ] Create or verify the live Pro price ID in Stripe
- [ ] Confirm `NEXT_PUBLIC_STRIPE_PRO_PRICE_ID` matches the intended live price
- [ ] Point the Stripe webhook at `/api/stripe/webhook`
- [ ] Verify webhook signing secret matches `STRIPE_WEBHOOK_SECRET`
- [ ] Test checkout end to end
- [ ] Test webhook retry behavior end to end
- [ ] Test billing portal access end to end
- [ ] Test downgrade / cancellation handling end to end

## Lead Capture and Automation

- [ ] Submit a real test lead via `/book/[booking_url_slug]`
- [ ] Verify the lead appears in `/dashboard/leads`
- [ ] Verify the immediate email sends through Resend
- [ ] Verify `lead_events` logs the `created` and `email_sent` events
- [ ] Verify the lead progresses through scheduled follow-up correctly
- [ ] Verify lead status changes work from the dashboard
- [ ] Verify lead conversion creates the expected client and job records

## Uploads and Storage

- [ ] Test browser upload success on a real job
- [ ] Test invalid file rejection
- [ ] Test oversized file rejection
- [ ] Verify signed URLs load correctly
- [ ] Verify deleting a photo removes it from storage

## Final Smoke Test

- [ ] Sign up with email
- [ ] Sign up with Google
- [ ] Confirm auth callback redirects correctly
- [ ] Create a client
- [ ] Create a job
- [ ] Create an invoice
- [ ] Send an invoice email
- [ ] Start a Stripe checkout session
- [ ] Open the billing portal
- [ ] Submit a lead
- [ ] Convert a booked lead into a job

## Success Criteria

- [ ] No failed cron runs
- [ ] No failed webhook deliveries
- [ ] No cross-tenant data visibility
- [ ] No broken invoice or OAuth links
- [ ] No upload permission failures in the browser
