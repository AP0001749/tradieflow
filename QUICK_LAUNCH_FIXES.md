# Quick Launch Fixes - Run These Commands

## 1. Database Migration (Run in Supabase SQL Editor)

```sql
-- Add subscription tracking columns
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS subscription_status TEXT,
ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMPTZ;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_subscription_id ON profiles(stripe_subscription_id);

-- Verify columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name LIKE '%subscription%';
```

## 2. Vercel Environment Variables

### Go to: https://vercel.com/dashboard → tradieflow → Settings → Environment Variables

Add/Update these:

```bash
# Production site URL
NEXT_PUBLIC_SITE_URL=https://tradieflow.vercel.app

# Stripe webhook secret (get from Stripe Dashboard after creating endpoint)
STRIPE_WEBHOOK_SECRET=whsec_XXXXXXXXXXXXXXXXXXXXXXXXXX
```

After updating, click "Redeploy" or run:
```bash
vercel --prod
```

## 3. Stripe Webhook Setup

### Go to: https://dashboard.stripe.com/webhooks

1. Click "Add endpoint"
2. Endpoint URL: `https://tradieflow.vercel.app/api/stripe/webhook`
3. Select these events:
   - ✅ checkout.session.completed
   - ✅ customer.subscription.created
   - ✅ customer.subscription.updated
   - ✅ customer.subscription.deleted
4. Click "Add endpoint"
5. Copy the webhook signing secret (starts with `whsec_`)
6. Add to Vercel (step 2 above)

## 4. Test Signup Flow

```bash
# Open incognito window
https://tradieflow.vercel.app/signup

# Create test account
Email: test+jan23@yourdomain.com

# Verify:
# - Redirected to /welcome
# - See welcome animation
# - Auto-redirect to /dashboard after 3s
```

## 5. Test Free Tier Limits

```bash
# Login to free account
# Go to /dashboard/clients
# Add 3 clients (should work)
# Try to add 4th client
# Should see error: "Free plan limited to 3 clients"
```

## 6. Test Stripe Checkout

```bash
# Go to /dashboard/billing
# Click "Upgrade to Pro"
# Use test card: 4242 4242 4242 4242
# Expiry: 12/28, CVC: 123, ZIP: 12345
# Complete payment
# Should redirect to /dashboard/billing?success=true
# Should see "Active Plan" badge
```

## 7. Verify Webhook Delivery

```bash
# Go to Stripe Dashboard → Webhooks → Your endpoint
# Click "Send test webhook"
# Select "checkout.session.completed"
# Check response is 200 OK
```

## 8. Monitor First Hour

```bash
# Watch Vercel function logs:
https://vercel.com/dashboard/deployments

# Watch Stripe webhook logs:
https://dashboard.stripe.com/webhooks

# Watch Supabase logs:
https://supabase.com/dashboard/project/ofshuyyejlbvoylufrjr/logs
```

## Checklist

- [ ] Database migration applied ✅
- [ ] `NEXT_PUBLIC_SITE_URL` set in Vercel ✅
- [ ] Stripe webhook endpoint created ✅
- [ ] `STRIPE_WEBHOOK_SECRET` set in Vercel ✅
- [ ] Application redeployed ✅
- [ ] Test signup works ✅
- [ ] Test free tier limits work ✅
- [ ] Test Stripe checkout works ✅
- [ ] Test webhook delivery works ✅
- [ ] Switch to Stripe live mode ✅
- [ ] Monitor for 1 hour ✅

**Total Time: ~60 minutes**

Once all checked, you're ready to launch! 🚀
