# TradieFlow Deployment Checklist

## Pre-Deployment

- [ ] Run local code verification:
  `npm run release:gate`
- [ ] Confirm the `TradieFlow Release Gate` GitHub Actions workflow is green for the branch
- [ ] Prepare production env preflight values:
  `Copy-Item .env.production.local.example .env.production.local`
  Fill `.env.production.local` with real hosted values, not placeholders
- [ ] Run production env preflight:
  `npm run preflight:production:strict`
  `npm run release:gate:strict`
- [ ] Optional local `.env.local` preflight:
  `npm run preflight:production`
- [ ] Run local smoke test while the app is running:
  `.\scripts\smoke-test.ps1 -BookingUrlSlug your-booking-slug`
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
  `NEXT_PUBLIC_STRIPE_BASELINE_PRICE_ID`
  `NEXT_PUBLIC_STRIPE_APEX_PRICE_ID`
  `NEXT_PUBLIC_STRIPE_PRO_PRICE_ID`
  `TWILIO_ACCOUNT_SID`
  `TWILIO_AUTH_TOKEN`
  `TWILIO_SKIP_SIGNATURE_VALIDATION=false`
  `LEAD_FOLLOWUP_SECRET`
  `CRON_SECRET` only as a legacy alias during cutover
- [ ] Confirm a real `business_profile.booking_url_slug` exists for smoke testing
- [ ] Test the public booking page at `/book/[booking_url_slug]`
- [ ] Test the dashboard Outreach kit at `/dashboard/outreach`
- [ ] Confirm Settings shows the expected Baseline/Apex automation locks
- [ ] Verify invoice email rendering locally
- [ ] Verify a business profile exists in `/dashboard/settings`

## Vercel / App Host

- [ ] Deploy the latest `main`
- [ ] Copy `.env.production.local.example` to `.env.production.local` for local
      preflight checks, then mirror those values into the app host
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
  `NEXT_PUBLIC_STRIPE_BASELINE_PRICE_ID`
  `NEXT_PUBLIC_STRIPE_APEX_PRICE_ID`
  `NEXT_PUBLIC_STRIPE_PRO_PRICE_ID`
  `TWILIO_ACCOUNT_SID`
  `TWILIO_AUTH_TOKEN`
  `TWILIO_SKIP_SIGNATURE_VALIDATION=false`
  `LEAD_FOLLOWUP_SECRET` if using `/api/cron/leads-followup`
  `CRON_SECRET` only as a legacy alias during cutover
  `NEXT_PUBLIC_GOOGLE_ADS_LEAD_LABEL` if using lead conversion tracking
  `NEXT_PUBLIC_GOOGLE_ADS_SUBSCRIBE_LABEL` if using subscription conversion tracking
- [ ] Verify `/login`, `/signup`, and `/dashboard` behave correctly after deploy
- [ ] Verify `/dashboard/outreach` loads and copies the dispatch-audit scripts
- [ ] Verify `POST /api/cron/leads-followup` returns an authenticated success response if you are using the hosted compatibility processor
- [ ] Verify `POST /api/cron/zero-leak` returns an authenticated success response after migrations are live
- [ ] If using GitHub Actions fallback scheduling, confirm repo secrets:
  `APP_BASE_URL`
  `LEAD_FOLLOWUP_SECRET` or `CRON_SECRET`
- [ ] Confirm the app-host and GitHub Actions secrets are both present in the route allowlist during cutover
- [ ] If both GitHub secrets exist during cutover, confirm at least one matches the app-host route secret set
- [ ] Use `.\scripts\check-followup-route.ps1` to confirm the live route version, secret count, and secret source headers

## Supabase

- [ ] Apply production migrations, including:
  `20260324174500_move_lead_followup_to_supabase_cron.sql`
  `20260330150000_centralize_tier_limits.sql`
  `20260401061000_add_subscription_plan_key.sql`
  `20260401064500_add_zero_leak_automation_settings.sql`
  `20260401073000_add_automation_tracking_fields.sql`
  `20260404083000_add_lead_sms_tracking.sql`
  `20260407090000_add_zero_leak_dispatch_claims.sql`
  `20260407103000_add_missed_call_text_back_routing.sql`
  `20260408100000_add_missed_call_textback_claims.sql`
  `20260408113000_add_dispatch_profile_fields.sql`
  `20260408124500_expand_create_job_with_trade_fields.sql`
  `20260409091500_expand_zero_leak_sms_channels.sql`
  `20260409103000_add_job_dispatch_fields.sql`
  `20260409114500_add_dispatch_roster_to_business_profile.sql`
  `20260410083000_expand_public_booking_profile_job_types.sql`
  `20260410101500_add_primary_trade_focus_to_business_profile.sql`
  `20260410114500_add_job_dispatch_sequence.sql`
  `20260410131500_add_job_dispatch_check_in_fields.sql`
  `20260411100000_add_field_check_in_links_to_jobs.sql`
  `20260411113000_add_job_dispatch_events.sql`
  `20260411124500_add_lead_emergency_triage.sql`
  `20260411133000_add_lead_first_response_at.sql`
  `20260411143000_add_business_lead_response_slas.sql`
  `20260411153000_update_zero_leak_emergency_trade_templates.sql`
  `20260411160000_add_sms_opt_out_to_zero_leak_templates.sql`
  `20260411163000_gate_zero_leak_apex_automations.sql`
  `20260411164500_gate_missed_call_baseline_automation.sql`
- [ ] Verify hosted Supabase auth settings directly in the live project dashboard
- [ ] Verify RLS / tenant isolation in the live database
- [ ] Confirm `tier_limits` contains the expected free, Baseline, and Apex plan rows
- [ ] Confirm `business_profile` has the new dispatch, Twilio, automation, and SLA columns
- [ ] Confirm `jobs` has dispatch fields, check-in fields, share-token fields, and quote follow-up claim fields
- [ ] Confirm `leads` has triage, first-response, and SMS suppression fields
- [ ] Confirm `job_dispatch_events` and `twilio_missed_call_textbacks` exist
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

- [ ] Create or verify the live Baseline price ID in Stripe
- [ ] Create or verify the live Apex price ID in Stripe
- [ ] Confirm `NEXT_PUBLIC_STRIPE_BASELINE_PRICE_ID` matches the intended `$299 AUD / month` price
- [ ] Confirm `NEXT_PUBLIC_STRIPE_APEX_PRICE_ID` matches the intended `$499 AUD / month` price
- [ ] Keep `NEXT_PUBLIC_STRIPE_PRO_PRICE_ID` only as a legacy Baseline fallback during cutover
- [ ] Point the Stripe webhook at `/api/stripe/webhook`
- [ ] Verify webhook signing secret matches `STRIPE_WEBHOOK_SECRET`
- [ ] Test Baseline checkout end to end
- [ ] Test Apex checkout end to end
- [ ] Test webhook retry behavior end to end
- [ ] Test billing portal access end to end
- [ ] Test plan changes, downgrade, cancellation, and expired subscription handling end to end
- [ ] Verify Baseline can arm missed-call recovery but not quote/review automations
- [ ] Verify Apex can arm missed-call recovery, quote nurture, and review extraction

## Lead Capture and Automation

- [ ] Submit a real test lead via `/book/[booking_url_slug]`
- [ ] Verify the lead appears in `/dashboard/leads`
- [ ] Verify emergency triage fields, response SLA, and safety-risk flags are populated
- [ ] Verify the emergency lead appears in the dashboard emergency queue
- [ ] Verify the immediate email sends through Resend
- [ ] Verify `lead_events` logs the `created` and `email_sent` events
- [ ] Verify the lead progresses through scheduled follow-up correctly
- [ ] Verify lead status changes work from the dashboard
- [ ] Verify lead conversion creates the expected client and job records
- [ ] Verify converted lead triage details copy into the job description and dispatch priority
- [ ] Verify `POST /api/cron/zero-leak` can process due quote nurture and review extraction for an Apex workspace
- [ ] Verify quote/review SMS includes STOP opt-out copy and respects SMS suppression

## Twilio

- [ ] Confirm the owned Twilio number is stored in `/dashboard/settings`
- [ ] Configure inbound SMS webhook as `POST https://your-app-host/api/twilio/webhook`
- [ ] Configure voice webhook as `POST https://your-app-host/api/twilio/voice`
- [ ] Keep `TWILIO_SKIP_SIGNATURE_VALIDATION=false` in production
- [ ] Verify missed-call forwarding dials the tradie/dispatcher number for 15 seconds
- [ ] Verify missed-call text-back only sends for Baseline or Apex workspaces
- [ ] Verify repeat missed calls from closed contacts create a new active emergency lead
- [ ] Verify inbound STOP suppresses future automated SMS
- [ ] Verify wrong-number replies suppress future automated SMS

## Dispatch and Field Ops

- [ ] Configure team size, after-hours coverage, dispatch radius, service areas, and default job types
- [ ] Configure dispatch roster shortcuts in Settings
- [ ] Create a job with dispatch priority, service window, and assigned crew
- [ ] Verify the Dispatch page queue, route pack, and day sheet render the job
- [ ] Generate or enable the technician field check-in link for the job
- [ ] Open `/field/[token]` on mobile and submit a check-in
- [ ] Verify optional browser GPS capture stores coordinates and appears in the job timeline
- [ ] Pause/resume and rotate the field check-in link from job detail

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
- [ ] Run:
  `.\scripts\smoke-test.ps1 -AppBaseUrl https://your-app-host -BookingUrlSlug your-booking-slug -RunZeroLeak`

## Success Criteria

- [ ] No failed cron runs
- [ ] No failed webhook deliveries
- [ ] No cross-tenant data visibility
- [ ] No broken invoice or OAuth links
- [ ] No upload permission failures in the browser
- [ ] No Zero-Leak automation sends for a workspace below its required plan
- [ ] No automated SMS sends to leads with STOP or wrong-number suppression
