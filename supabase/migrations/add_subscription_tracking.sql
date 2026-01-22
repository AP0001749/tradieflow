-- Add subscription tracking columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS subscription_status TEXT,
ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMPTZ;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_subscription_id ON profiles(stripe_subscription_id);

-- Add comment for documentation
COMMENT ON COLUMN profiles.stripe_subscription_id IS 'Stripe subscription ID (sub_xxx)';
COMMENT ON COLUMN profiles.subscription_status IS 'Stripe subscription status: active, canceled, past_due, etc.';
COMMENT ON COLUMN profiles.subscription_start_date IS 'When the current subscription period started';
COMMENT ON COLUMN profiles.subscription_end_date IS 'When the current subscription period ends';
