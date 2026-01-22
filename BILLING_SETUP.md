# Stripe Billing Setup Guide

## Overview
Your Stripe billing integration is now complete with full subscription lifecycle management. This document explains what's been implemented and how to test/deploy it.

## What's Fixed

### 1. Database Schema
Added subscription tracking columns to the `profiles` table:
- `stripe_subscription_id` - Stores the Stripe subscription ID (sub_xxx)
- `subscription_status` - Tracks subscription state (active, canceled, past_due, etc.)
- `subscription_start_date` - Current billing period start
- `subscription_end_date` - Next billing date

### 2. Webhook Events
The webhook now handles complete subscription lifecycle:

#### `checkout.session.completed`
- Triggered when user completes payment
- Upgrades user to Pro tier
- Stores subscription ID and customer ID
- Sets subscription status to "active"

#### `customer.subscription.created` / `customer.subscription.updated`
- Triggered on subscription changes
- Updates subscription status (active, past_due, canceled, etc.)
- Updates billing period dates
- Handles plan changes

#### `customer.subscription.deleted`
- Triggered when subscription is canceled
- Downgrades user to free tier
- Sets status to "canceled"
- Records cancellation date

### 3. Subscription Enforcement
Updated subscription checking logic:
- Pro users need **active**, **trialing**, or **past_due** status
- Past_due gives grace period for payment updates
- Canceled subscriptions immediately revert to free tier limits
- Free tier: 3 clients, 5 jobs, 10 invoices

### 4. Billing Page Improvements
- Shows subscription status badge (Active/Payment Due/Canceled)
- Displays next billing date for Pro users
- Shows current usage for free tier users
- "Manage Subscription" button opens Stripe Customer Portal

## Required Setup Steps

### Step 1: Run Database Migration

**Option A: Using Supabase Dashboard (Recommended)**
1. Go to https://supabase.com/dashboard/project/ofshuyyejlbvoylufrjr
2. Navigate to: SQL Editor
3. Click "New Query"
4. Copy and paste the contents of `supabase/migrations/add_subscription_tracking.sql`
5. Click "Run"

**Option B: Using Supabase CLI**
```bash
# If you have Supabase CLI installed
supabase db push
```

### Step 2: Configure Stripe Webhook

#### Development (Local Testing)
1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
2. Login: `stripe login`
3. Forward webhooks to local server:
```bash
stripe listen --forward-to http://localhost:3000/api/stripe/webhook
```
4. Copy the webhook signing secret (starts with `whsec_`)
5. Update `.env.local`:
```
STRIPE_WEBHOOK_SECRET=whsec_your_local_secret_here
```

#### Production (Vercel)
1. Go to Stripe Dashboard: https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Enter webhook URL: `https://yourdomain.com/api/stripe/webhook`
4. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copy the webhook signing secret
6. Add to Vercel environment variables:
   - Go to Vercel Dashboard → Project Settings → Environment Variables
   - Add `STRIPE_WEBHOOK_SECRET` with the production webhook secret
   - Redeploy your application

### Step 3: Test the Billing Flow

#### Test Checkout Flow
1. Start local server: `npm run dev`
2. Login to your app
3. Go to `/dashboard/billing`
4. Click "Upgrade to Pro"
5. Use Stripe test card: `4242 4242 4242 4242`
   - Use any future expiry date
   - Use any 3-digit CVC
   - Use any ZIP code
6. Complete checkout
7. Verify:
   - Redirected to billing page with success message
   - Badge shows "Active Plan"
   - Dashboard features are unlocked (unlimited clients/jobs/invoices)

#### Test Customer Portal
1. As a Pro user, go to `/dashboard/billing`
2. Click "Manage Subscription"
3. You should see Stripe Customer Portal
4. Test actions:
   - Update payment method
   - Cancel subscription
   - View invoices

#### Test Subscription Cancellation
1. From Customer Portal, cancel subscription
2. Webhook should fire `customer.subscription.deleted`
3. Check console logs for webhook processing
4. Verify user is downgraded to free tier
5. Try creating 4th client - should show limit error

## Monitoring

### Check Webhook Deliveries
1. Go to Stripe Dashboard → Developers → Webhooks
2. Click on your webhook endpoint
3. View "Attempts" tab to see all webhook deliveries
4. Check for failed deliveries (retry automatically up to 3 times)

### Database Verification
Check user subscription status in Supabase:
```sql
SELECT 
  user_id,
  subscription_tier,
  subscription_status,
  stripe_customer_id,
  stripe_subscription_id,
  subscription_end_date
FROM profiles
WHERE user_id = 'your-user-id';
```

## Important Notes

### Grace Period
Users with `past_due` status can still use Pro features to allow time for payment updates. Stripe will attempt payment recovery automatically.

### Webhook Retries
Stripe retries failed webhooks automatically:
- Immediate retry after failure
- Retry after 1 hour
- Retry after 24 hours

### Production Checklist
- [ ] Database migration applied to production
- [ ] Production webhook endpoint added in Stripe Dashboard
- [ ] STRIPE_WEBHOOK_SECRET environment variable set in Vercel
- [ ] Test checkout in production with test mode
- [ ] Switch to live mode in Stripe Dashboard
- [ ] Update STRIPE_SECRET_KEY to live key
- [ ] Test with real credit card (refund after)
- [ ] Monitor webhook deliveries for 24 hours

## Troubleshooting

### Webhook Not Firing
- Check webhook URL is correct
- Verify STRIPE_WEBHOOK_SECRET matches Stripe Dashboard
- Check Vercel function logs for errors
- Ensure endpoint returns 200 status

### User Not Upgraded After Payment
- Check Stripe Dashboard → Payments for successful payment
- Check webhook attempts in Stripe Dashboard
- Verify metadata.userId is being passed in checkout session
- Check Supabase logs for database update errors

### Subscription Not Canceling
- Check webhook for `customer.subscription.deleted` event
- Verify stripe_customer_id matches in database
- Check Supabase admin client has correct service role key

## Support

If issues persist:
1. Check Stripe Dashboard webhook logs
2. Check Vercel function logs
3. Check Supabase logs
4. Contact Stripe support with webhook attempt IDs
