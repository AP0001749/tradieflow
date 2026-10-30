'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { normalizeBookingUrlSlug } from '@/lib/booking';
import { normalizeDispatchRoster } from '@/lib/dispatch-roster';
import {
  getEffectiveSubscriptionPlanKey,
  hasApexAutomationAccess,
  hasBaselineAutomationAccess,
} from '@/lib/pricing';
import {
  DEFAULT_MISSED_CALL_TEXT_TEMPLATE,
  DEFAULT_QUOTE_FOLLOWUP_TEMPLATE,
  DEFAULT_REVIEW_REQUEST_TEMPLATE,
  coerceAutomationTemplate,
} from '@/lib/zero-leak';
import { assertTwilioNumberOwnedByAccount } from '@/lib/twilio-ownership';
import { revalidatePath } from 'next/cache';

async function generateAvailableBookingSlug(
  preferredValue: string,
  profileIdToIgnore?: string
) {
  const supabaseAdmin = createAdminClient();
  const normalizedBase = normalizeBookingUrlSlug(preferredValue);

  if (!normalizedBase) {
    throw new Error('Public lead link slug is required');
  }

  for (let attempt = 0; attempt < 25; attempt += 1) {
    const candidate =
      attempt === 0 ? normalizedBase : `${normalizedBase}-${attempt + 1}`;

    let query = supabaseAdmin
      .from('business_profile')
      .select('id')
      .eq('booking_url_slug', candidate)
      .limit(1);

    if (profileIdToIgnore) {
      query = query.neq('id', profileIdToIgnore);
    }

    const { data: existing, error } = await query.maybeSingle();
    if (error) {
      throw error;
    }

    if (!existing) {
      return candidate;
    }
  }

  throw new Error('Could not generate a unique public lead link slug');
}

export async function getBusinessProfile() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('business_profile')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function updateBusinessProfile(formData: {
  business_name: string;
  primary_trade_focus?: string;
  reply_to_email: string;
  google_review_url?: string;
  service_area_postcodes?: string[];
  default_job_types?: string[];
  booking_url_slug?: string;
  team_size?: string;
  after_hours_coverage?: string;
  dispatch_radius?: string;
  dispatch_roster?: string[];
  missed_call_text_enabled?: boolean;
  missed_call_text_template?: string;
  missed_call_forwarding_number?: string;
  twilio_phone_number?: string;
  emergency_response_sla_minutes?: number;
  same_day_response_sla_minutes?: number;
  scheduled_response_sla_minutes?: number;
  quote_response_sla_minutes?: number;
  quote_followup_enabled?: boolean;
  quote_followup_delay_hours?: number;
  quote_followup_template?: string;
  review_request_enabled?: boolean;
  review_request_delay_hours?: number;
  review_request_template?: string;
}) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: subscriptionProfile } = await supabase
    .from('profiles')
    .select('subscription_tier, subscription_plan_key, subscription_status')
    .eq('user_id', user.id)
    .maybeSingle();
  const currentPlanKey = getEffectiveSubscriptionPlanKey({
    subscriptionPlanKey: subscriptionProfile?.subscription_plan_key,
    subscriptionTier: subscriptionProfile?.subscription_tier,
    subscriptionStatus: subscriptionProfile?.subscription_status,
  });
  const canUseApexAutomations = hasApexAutomationAccess(currentPlanKey);
  const canUseBaselineAutomations = hasBaselineAutomationAccess(currentPlanKey);

  const { data: existing, error: existingError } = await supabase
    .from('business_profile')
    .select('id, twilio_phone_number')
    .eq('user_id', user.id)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  const bookingUrlSlug = await generateAvailableBookingSlug(
    formData.booking_url_slug || formData.business_name,
    existing?.id
  );

  const requestedTwilioNumber = formData.twilio_phone_number?.trim() || null;
  const existingTwilioNumber =
    (existing as { twilio_phone_number?: string | null } | null)?.twilio_phone_number || null;
  const sameTwilioNumber =
    (requestedTwilioNumber || '').replace(/\D+/g, '') ===
    (existingTwilioNumber || '').replace(/\D+/g, '');

  // Twilio mapping is enforced server-side: ownership check + service-role write.
  // Client-side updates to twilio_phone_number are blocked by a database trigger.
  if (requestedTwilioNumber && !sameTwilioNumber) {
    await assertTwilioNumberOwnedByAccount(requestedTwilioNumber);
  }

  const payload = {
    business_name: formData.business_name,
    primary_trade_focus: formData.primary_trade_focus?.trim() || 'mixed_trade',
    reply_to_email: formData.reply_to_email,
    google_review_url: formData.google_review_url || null,
    service_area_postcodes: formData.service_area_postcodes || [],
    default_job_types: formData.default_job_types || [],
    booking_url_slug: bookingUrlSlug,
    team_size: formData.team_size?.trim() || null,
    after_hours_coverage: formData.after_hours_coverage?.trim() || null,
    dispatch_radius: formData.dispatch_radius?.trim() || null,
    dispatch_roster: normalizeDispatchRoster(formData.dispatch_roster || []),
    missed_call_text_enabled: canUseBaselineAutomations && Boolean(formData.missed_call_text_enabled),
    missed_call_text_template: coerceAutomationTemplate(
      formData.missed_call_text_template,
      DEFAULT_MISSED_CALL_TEXT_TEMPLATE
    ),
    missed_call_forwarding_number: formData.missed_call_forwarding_number?.trim() || null,
    emergency_response_sla_minutes: Math.min(
      Math.max(1, Math.round(formData.emergency_response_sla_minutes || 15)),
      10080
    ),
    same_day_response_sla_minutes: Math.min(
      Math.max(1, Math.round(formData.same_day_response_sla_minutes || 60)),
      10080
    ),
    scheduled_response_sla_minutes: Math.min(
      Math.max(1, Math.round(formData.scheduled_response_sla_minutes || 240)),
      10080
    ),
    quote_response_sla_minutes: Math.min(
      Math.max(1, Math.round(formData.quote_response_sla_minutes || 1440)),
      10080
    ),
    quote_followup_enabled: canUseApexAutomations && Boolean(formData.quote_followup_enabled),
    quote_followup_delay_hours: Math.max(1, Math.round(formData.quote_followup_delay_hours || 48)),
    quote_followup_template: coerceAutomationTemplate(
      formData.quote_followup_template,
      DEFAULT_QUOTE_FOLLOWUP_TEMPLATE
    ),
    review_request_enabled: canUseApexAutomations && Boolean(formData.review_request_enabled),
    review_request_delay_hours: Math.max(1, Math.round(formData.review_request_delay_hours || 24)),
    review_request_template: coerceAutomationTemplate(
      formData.review_request_template,
      DEFAULT_REVIEW_REQUEST_TEMPLATE
    ),
  };

  if (existing?.id) {
    const { error } = await supabase
      .from('business_profile')
      .update(payload)
      .eq('id', existing.id)
      .eq('user_id', user.id);

    if (error) {
      throw error;
    }

    if (!sameTwilioNumber) {
      const supabaseAdmin = createAdminClient();
      const { error: twilioError } = await supabaseAdmin
        .from('business_profile')
        .update({ twilio_phone_number: requestedTwilioNumber })
        .eq('id', existing.id)
        .eq('user_id', user.id);

      if (twilioError) {
        if (twilioError.code === '23505' && /twilio|normalize_phone/i.test(twilioError.message)) {
          throw new Error('That Twilio number is already assigned to another workspace.');
        }
        throw twilioError;
      }
    }
  } else {
    const { data: created, error } = await supabase
      .from('business_profile')
      .insert({
        user_id: user.id,
        ...payload,
      })
      .select('id')
      .single();

    if (error) {
      throw error;
    }

    if (requestedTwilioNumber && created?.id) {
      const supabaseAdmin = createAdminClient();
      const { error: twilioError } = await supabaseAdmin
        .from('business_profile')
        .update({ twilio_phone_number: requestedTwilioNumber })
        .eq('id', created.id)
        .eq('user_id', user.id);

      if (twilioError) {
        if (twilioError.code === '23505' && /twilio|normalize_phone/i.test(twilioError.message)) {
          throw new Error('That Twilio number is already assigned to another workspace.');
        }
        throw twilioError;
      }
    }
  }

  revalidatePath('/dashboard/settings');
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/jobs');
  revalidatePath('/dashboard/dispatch');
  revalidatePath('/dashboard/leads');
  revalidatePath('/book');
}
