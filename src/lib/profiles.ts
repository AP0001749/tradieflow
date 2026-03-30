import "server-only";

import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

function getDisplayName(user: User) {
  const metadata = user.user_metadata;
  const fullName =
    (typeof metadata?.full_name === "string" && metadata.full_name.trim()) ||
    (typeof metadata?.name === "string" && metadata.name.trim()) ||
    null;

  return fullName;
}

export async function ensureProfileExists(user: User) {
  const supabaseAdmin = createAdminClient();

  const { data: existingProfile, error: existingProfileError } = await supabaseAdmin
    .from("profiles")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingProfileError) {
    throw existingProfileError;
  }

  if (existingProfile) {
    return { created: false };
  }

  const payload = {
    user_id: user.id,
    subscription_tier: "free",
    subscription_status: "inactive",
  };

  const { error: insertError } = await supabaseAdmin.from("profiles").insert(payload);

  if (insertError && insertError.code !== "23505") {
    throw insertError;
  }

  const displayName = getDisplayName(user);
  const profileEnrichment = {
    ...(user.email ? { email: user.email } : {}),
    ...(displayName ? { full_name: displayName } : {}),
  };

  if (Object.keys(profileEnrichment).length === 0) {
    return { created: true };
  }

  const { error: updateError } = await supabaseAdmin
    .from("profiles")
    .update(profileEnrichment)
    .eq("user_id", user.id);

  if (updateError) {
    // Older databases may not yet expose these optional profile columns.
    console.warn("Skipping profile enrichment:", updateError);
  }

  return { created: true };
}
