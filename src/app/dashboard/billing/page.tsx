import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SubscribeButton } from "./subscribe-button";
import { SubscriptionSuccessTracker } from "./subscription-success-tracker";
import { CheckCircle2, XCircle } from "lucide-react";
import { checkSubscriptionLimits } from "@/lib/subscription";

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
    .select("subscription_tier, stripe_customer_id, subscription_status, subscription_end_date, full_name")
    .eq("user_id", user.id)
    .maybeSingle();

  const tier =
    (profile as { subscription_tier?: string | null } | null)?.subscription_tier ??
    "free";
  
  const subscriptionStatus =
    (profile as { subscription_status?: string | null } | null)?.subscription_status ?? null;
  
  const subscriptionEndDate =
    (profile as { subscription_end_date?: string | null } | null)?.subscription_end_date ?? null;
  
  const fullName =
    (profile as { full_name?: string | null } | null)?.full_name ?? null;

  const priceId = process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID;

  const params = await searchParams;

  // Get current usage for free tier users
  const usage = tier === "free" ? await checkSubscriptionLimits() : null;
{/* Track subscription conversion on success */}
      <SubscriptionSuccessTracker 
        userEmail={user.email}
        userName={fullName}
        subscriptionValue={29}
      />

      
  return (
    <div className="space-y-8">
      <div className="animate-in fade-in slide-in-from-top-4 duration-700">
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text">Billing</h1>
        <p className="text-muted-foreground mt-1">Manage your subscription plan.</p>
      </div>

      {/* Success/Cancel Messages */}
      {params.success === "true" && (
        <div className="p-5 rounded-xl flex items-start gap-3 border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 shadow-lg shadow-emerald-500/10 animate-in fade-in slide-in-from-top-2 duration-500">
          <CheckCircle2 className="h-5 w-5 text-emerald-300 mt-0.5" />
          <div>
            <h3 className="font-semibold text-emerald-300">Payment Successful!</h3>
            <p className="text-sm text-emerald-300/90 mt-1">
              Your Pro subscription is now active. Welcome aboard!
            </p>
          </div>
        </div>
      )}

      {params.canceled === "true" && (
        <div className="p-5 rounded-xl flex items-start gap-3 border border-orange-500/30 bg-gradient-to-br from-orange-500/10 to-orange-500/5 shadow-lg shadow-orange-500/10 animate-in fade-in slide-in-from-top-2 duration-500">
          <XCircle className="h-5 w-5 text-orange-300 mt-0.5" />
          <div>
            <h3 className="font-semibold text-orange-200">Payment Canceled</h3>
            <p className="text-sm text-orange-200/80 mt-1">
              No charges were made. You can try again whenever you&apos;re ready.
            </p>
          </div>
        </div>
      )}

      {tier === "free" ? (
        <Card className="p-6 space-y-5 max-w-xl border-border/60 shadow-lg hover:shadow-xl transition-all duration-500 animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Pro Plan</h2>
              <p className="text-muted-foreground mt-1">$29/month</p>
            </div>
            <Badge variant="outline" className="text-muted-foreground">
              Current: Free
            </Badge>
          </div>

          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-300" />
              Unlimited clients & jobs
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-300" />
              Professional invoicing
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-300" />
              Priority support
            </li>
          </ul>

          {usage && (
            <div className="p-4 rounded-lg bg-muted/50 border border-border/40 space-y-3">
              <p className="text-sm font-medium text-muted-foreground">Current Usage (Free Tier)</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Clients</span>
                  <span className="font-medium tabular-nums">
                    {usage.current?.clients ?? 0} / {usage.limits?.maxClients ?? 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Jobs</span>
                  <span className="font-medium tabular-nums">
                    {usage.current?.jobs ?? 0} / {usage.limits?.maxJobs ?? 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Invoices</span>
                  <span className="font-medium tabular-nums">
                    {usage.current?.invoices ?? 0} / {usage.limits?.maxInvoices ?? 0}
                  </span>
                </div>
              </div>
            </div>
          )}

          {priceId ? (
            <SubscribeButton priceId={priceId} userId={user.id} />
          ) : (
            <div className="text-sm text-rose-300 p-3 bg-rose-500/10 rounded border border-rose-500/20">
              Missing env var: NEXT_PUBLIC_STRIPE_PRO_PRICE_ID
            </div>
          )}
        </Card>
      ) : (
        <Card className="p-6 space-y-4 max-w-xl border-emerald-500/20 bg-emerald-500/5 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Pro Plan</h2>
              <p className="text-muted-foreground mt-1">$29/month</p>
            </div>
            <Badge className="bg-emerald-500/15 text-emerald-300 border-transparent">
              {subscriptionStatus === "active" ? "Active" : subscriptionStatus === "past_due" ? "Payment Due" : "Pro"} Plan
            </Badge>
          </div>

          <p className="text-sm text-muted-foreground">
            You have full access to all Pro features.
          </p>

          {subscriptionEndDate && (
            <p className="text-xs text-muted-foreground">
              Next billing date: {new Date(subscriptionEndDate).toLocaleDateString('en-AU', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          )}

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
