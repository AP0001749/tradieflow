import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getBusinessProfile } from './actions';
import SettingsForm from './settings-form';
import {
  getEffectiveSubscriptionPlanKey,
  normalizeSubscriptionPlanKey,
} from '@/lib/pricing';

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const profile = await getBusinessProfile();
  const { data: subscriptionProfile } = await supabase
    .from('profiles')
    .select('subscription_tier, subscription_plan_key, subscription_status')
    .eq('user_id', user.id)
    .maybeSingle();
  const currentPlanKey = getEffectiveSubscriptionPlanKey({
    subscriptionPlanKey: normalizeSubscriptionPlanKey(subscriptionProfile?.subscription_plan_key),
    subscriptionTier: subscriptionProfile?.subscription_tier,
    subscriptionStatus: subscriptionProfile?.subscription_status,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Business Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure your business profile, primary trade lane, dispatch operating model, public funnel, and automation templates
        </p>
      </div>

      <SettingsForm profile={profile} subscriptionPlanKey={currentPlanKey} />
    </div>
  );
}
