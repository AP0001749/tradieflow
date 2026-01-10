import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SubscribeButton } from "./subscribe-button";
import { CheckCircle2, XCircle } from "lucide-react";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; canceled?: string }>;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier, stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const tier = (profile as any)?.subscription_tier ?? "free";

  const priceId = process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID;

  const params = await searchParams;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Billing</h1>
        <p className="text-gray-500 mt-1">Manage your subscription plan.</p>
      </div>

      {/* Success/Cancel Messages */}
      {params.success === "true" && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-green-900">Payment Successful!</h3>
            <p className="text-sm text-green-700 mt-1">
              Your Pro subscription is now active. Welcome aboard!
            </p>
          </div>
        </div>
      )}

      {params.canceled === "true" && (
        <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-3">
          <XCircle className="h-5 w-5 text-orange-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-orange-900">Payment Canceled</h3>
            <p className="text-sm text-orange-700 mt-1">
              No charges were made. You can try again whenever you&apos;re ready.
            </p>
          </div>
        </div>
      )}

      {tier === "free" ? (
        <Card className="p-6 space-y-4 max-w-xl border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Pro Plan</h2>
              <p className="text-gray-600 mt-1">$29/month</p>
            </div>
            <Badge variant="outline" className="text-gray-600">
              Current: Free
            </Badge>
          </div>

          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Unlimited clients & jobs
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Professional invoicing
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Priority support
            </li>
          </ul>

          {priceId ? (
            <SubscribeButton priceId={priceId} userId={user.id} />
          ) : (
            <div className="text-sm text-red-600 p-3 bg-red-50 rounded border border-red-200">
              Missing env var: NEXT_PUBLIC_STRIPE_PRO_PRICE_ID
            </div>
          )}
        </Card>
      ) : (
        <Card className="p-6 space-y-4 max-w-xl border-green-200 bg-green-50/50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Pro Plan</h2>
              <p className="text-gray-600 mt-1">$29/month</p>
            </div>
            <Badge className="bg-green-600 text-white">Active Pro Plan</Badge>
          </div>

          <p className="text-sm text-gray-700">
            You have full access to all Pro features.
          </p>

          <form action="/api/stripe/portal" method="post">
            <Button type="submit" variant="outline" className="w-full">
              Manage Subscription
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}
