import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import twilio from "npm:twilio";
import { Resend } from "npm:resend@6.7.0";

const createAdminClient = () => {
  const supabaseUrl = Deno.env.get("NEXT_PUBLIC_SUPABASE_URL") || Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) throw new Error("Missing Supabase Env");
  return createClient(supabaseUrl, serviceRoleKey);
};

serve(async (req) => {
  try {
    const supabase = createAdminClient();
    
    // Fetch pending DLQ items
    const { data: failures, error: fetchError } = await supabase
      .from("webhook_failures")
      .select("*")
      .eq("status", "pending")
      .lte("next_retry_at", new Date().toISOString())
      .limit(50);

    if (fetchError) throw fetchError;

    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioClient = accountSid && authToken ? twilio(accountSid, authToken) : null;

    for (const item of failures || []) {
      try {
        if (item.provider === "twilio") {
          if (!twilioClient) throw new Error("Twilio not configured");
          await twilioClient.messages.create(item.payload as any);
        } else if (item.provider === "resend") {
          await resend.emails.send(item.payload as any);
        }

        // Mark success
        await supabase.from("webhook_failures").update({ status: "success" }).eq("id", item.id);
      } catch (err) {
        // Increment retry, retry after +5 mins, or fail if > 5 retries
        const newRetryCount = item.retry_count + 1;
        const status = newRetryCount > 5 ? "failed" : "pending";
        const nextRetryAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
        const errorMessage = String(err).slice(0, 500);

        await supabase.from("webhook_failures").update({
          retry_count: newRetryCount,
          status,
          next_retry_at: nextRetryAt,
          error_message: errorMessage,
        }).eq("id", item.id);
      }
    }

    return new Response(JSON.stringify({ success: true, processed: failures?.length || 0 }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(String(err), { status: 500 });
  }
});
