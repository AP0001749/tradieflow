update public.business_profile as business_profile
set missed_call_text_enabled = false
from public.profiles as profiles
where profiles.user_id = business_profile.user_id
  and (
    coalesce(profiles.subscription_plan_key, 'free') not in ('baseline', 'apex')
    or coalesce(profiles.subscription_status, 'active') not in ('active', 'trialing', 'past_due')
  )
  and business_profile.missed_call_text_enabled = true;
