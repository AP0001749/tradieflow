# Stripe Environment Variables

# 1. Add these to your .env.local file:

# Required - Stripe Secret Key (from Stripe Dashboard)
STRIPE_SECRET_KEY=sk_test_xxxxx

# Required - Stripe Webhook Secret (from Stripe Dashboard -> Webhooks)
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Optional - Stripe Publishable Key (only needed if using Stripe.js client directly)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx

# Required - Your Stripe Pro Plan Price ID (from Stripe Dashboard -> Products)
NEXT_PUBLIC_STRIPE_PRO_PRICE_ID=price_xxxxx

# Required - Supabase Service Role Key for webhook writes (from Supabase Dashboard -> Settings -> API)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Optional - Your site URL (defaults to http://localhost:3000)
NEXT_PUBLIC_SITE_URL=https://yourdomain.com


# 2. Database Migration (if not already done):
# Run this SQL in your Supabase SQL Editor:

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free',
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON profiles(stripe_customer_id);


# 3. Stripe Webhook Configuration:
# - Go to Stripe Dashboard -> Developers -> Webhooks
# - Add endpoint: https://yourdomain.com/api/stripe/webhook
# - Select event: checkout.session.completed
# - Copy the signing secret to STRIPE_WEBHOOK_SECRET above


# 4. Test Locally with Stripe CLI:
# stripe listen --forward-to localhost:3000/api/stripe/webhook
# stripe trigger checkout.session.completed
