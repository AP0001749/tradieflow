import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export function getPhoneDigits(value: string | null | undefined) {
  return (value || "").replace(/\D+/g, "");
}

export async function isPhoneSmsSuppressed({
  businessId,
  phone,
}: {
  businessId: string;
  phone: string | null | undefined;
}) {
  const digits = getPhoneDigits(phone);
  if (!businessId || digits.length < 8) {
    return false;
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("is_sms_suppressed", {
    p_business_id: businessId,
    p_phone: phone,
  });

  if (error) {
    // Fallback for environments that have not applied the hardening migration yet.
    console.warn("is_sms_suppressed RPC unavailable; falling back to lead flag", error.message);
    const { data: lead } = await supabase
      .from("leads")
      .select("id")
      .eq("business_id", businessId)
      .eq("sms_do_not_contact", true)
      .not("phone", "is", null)
      .ilike("phone", `%${digits.slice(-9)}%`)
      .limit(1)
      .maybeSingle();

    return Boolean(lead);
  }

  return Boolean(data);
}

export async function upsertPhoneSmsSuppression({
  businessId,
  phone,
  reason,
  source,
  leadId,
}: {
  businessId: string;
  phone: string | null | undefined;
  reason?: string | null;
  source?: string | null;
  leadId?: string | null;
}) {
  const digits = getPhoneDigits(phone);
  if (!businessId || digits.length < 8) {
    return;
  }

  const supabase = createAdminClient();
  const { error } = await supabase.rpc("upsert_sms_suppression", {
    p_business_id: businessId,
    p_phone: phone,
    p_reason: reason || null,
    p_source: source || null,
    p_lead_id: leadId || null,
  });

  if (error) {
    console.warn("upsert_sms_suppression RPC unavailable", error.message);
  }
}
