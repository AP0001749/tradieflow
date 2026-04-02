import { CheckCircle2, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SubscribeButton } from "./subscribe-button";
import { SubscriptionSuccessTracker } from "./subscription-success-tracker";
import { checkSubscriptionLimits } from "@/lib/subscription";
import {
  getEffectiveSubscriptionPlanKey,
  getPlanPriceId,
  getSubscriptionPlanLabel,
  getPlanValue,
  getPricingPlans,
  normalizePlanKey,
  normalizeSubscriptionPlanKey,
} from "@/lib/pricing";
import { createClient } from "@/lib/supabase/server";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; canceled?: string; plan?: string }>;
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
    .select(
      "subscription_tier, subscription_plan_key, stripe_customer_id, stripe_subscription_id, subscription_status, subscription_end_date, full_name",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  const typedProfile = profile as {
    subscription_tier?: string | null;
    subscription_plan_key?: string | null;
    subscription_status?: string | null;
    subscription_end_date?: string | null;
    full_name?: string | null;
  } | null;
  const tier =
    typedProfile?.subscription_tier ?? "free";
  const storedPlanKey = normalizeSubscriptionPlanKey(typedProfile?.subscription_plan_key);
  const subscriptionStatus = typedProfile?.subscription_status ?? null;
  const subscriptionEndDate = typedProfile?.subscription_end_date ?? null;
  const fullName = typedProfile?.full_name ?? null;

  const params = await searchParams;
  const successPlanKey = params.success === "true" ? normalizePlanKey(params.plan) : null;
  const currentPlanKey = getEffectiveSubscriptionPlanKey({
    subscriptionPlanKey: storedPlanKey,
    subscriptionTier: tier,
    subscriptionStatus,
  });
  const hasPaidWorkspace = currentPlanKey !== "free";
  const usage = hasPaidWorkspace ? null : await checkSubscriptionLimits();

  const plans = getPricingPlans().map((plan) => ({
    ...plan,
    isConfigured: Boolean(getPlanPriceId(plan.key)),
  }));

  return (
    <div className="space-y-8">
      {params.success === "true" ? (
        <SubscriptionSuccessTracker
          userEmail={user.email}
          userName={fullName}
          subscriptionValue={getPlanValue(successPlanKey)}
        />
      ) : null}

      <div className="animate-in fade-in slide-in-from-top-4 duration-700">
        <h1 className="bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-3xl font-bold tracking-tight">
          Billing
        </h1>
        <p className="mt-1 text-muted-foreground">
          Manage the Zero-Leak Funnel subscription for your workspace.
        </p>
      </div>

      {params.success === "true" ? (
        <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/30 dark:bg-emerald-500/10">
          <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <div>
            <h3 className="font-semibold text-emerald-800 dark:text-emerald-300">
              Payment Successful
            </h3>
            <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-300/90">
              Your TradieFlow paid workspace is active.
              {successPlanKey ? ` ${successPlanKey === "apex" ? "Apex" : "Baseline"} pricing was selected at checkout.` : ""}
            </p>
          </div>
        </div>
      ) : null}

      {params.canceled === "true" ? (
        <div className="flex items-start gap-3 rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-500/30 dark:bg-orange-500/10">
          <XCircle className="mt-0.5 h-5 w-5 text-orange-600 dark:text-orange-400" />
          <div>
            <h3 className="font-semibold text-orange-800 dark:text-orange-200">
              Payment Canceled
            </h3>
            <p className="mt-1 text-sm text-orange-700 dark:text-orange-200/80">
              No charges were made. You can try again whenever you are ready.
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="grid gap-6 lg:grid-cols-2">
          {plans.map((plan) => {
            const isCurrentPlan = currentPlanKey === plan.key;
            const isApex = plan.key === "apex";

            return (
              <Card
                key={plan.key}
                className={`space-y-5 rounded-[1.5rem] p-6 shadow-lg transition-all duration-500 ${
                  isApex
                    ? "border-primary/25 bg-primary/5 shadow-primary/10"
                    : "border-border/60"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-semibold">{plan.name}</h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {plan.blurb}
                    </p>
                  </div>
                  {isCurrentPlan ? (
                    <Badge className="border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                      Current Plan
                    </Badge>
                  ) : isApex ? (
                    <Badge variant="outline">Higher Leverage</Badge>
                  ) : null}
                </div>

                <div className="flex items-end gap-2">
                  <span className="text-5xl font-semibold tracking-tight">${plan.priceAud}</span>
                  <span className="pb-2 text-muted-foreground">AUD / month</span>
                </div>

                <ul className="space-y-3 text-sm">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {!hasPaidWorkspace ? (
                  plan.isConfigured ? (
                    <SubscribeButton planKey={plan.key} label={plan.cta} />
                  ) : (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                      Stripe is not configured for the {plan.name} plan yet.
                    </div>
                  )
                ) : isCurrentPlan ? (
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm text-muted-foreground">
                    This plan is active for your workspace.
                  </div>
                ) : (
                  <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-sm text-muted-foreground">
                    Use the billing portal below for account management. Plan changes can
                    be handled there once both Stripe prices are enabled in your portal
                    configuration.
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        <div className="space-y-6">
          <Card className="space-y-4 border-border/60 p-6 shadow-lg">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">Workspace Status</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Subscription state and operational notes for this account.
                </p>
              </div>
              <Badge
                className={
                  !hasPaidWorkspace
                    ? "bg-muted text-muted-foreground"
                    : "border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                }
              >
                {!hasPaidWorkspace ? "Free" : subscriptionStatus === "past_due" ? "Payment Due" : "Paid"}
              </Badge>
            </div>

            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                Current plan:{" "}
                <span className="font-medium text-foreground">
                  {getSubscriptionPlanLabel(currentPlanKey)}
                </span>
              </p>
              {subscriptionEndDate ? (
                <p>
                  Next billing date:{" "}
                  <span className="font-medium text-foreground">
                    {new Date(subscriptionEndDate).toLocaleDateString("en-AU", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </p>
              ) : null}
              <p>
                Billing now stores the workspace plan key directly, so Baseline and Apex
                can be enforced without remapping Stripe state on every page load.
              </p>
            </div>

            {hasPaidWorkspace ? (
              <form action="/api/stripe/portal" method="post">
                <button
                  type="submit"
                  className="inline-flex h-10 w-full items-center justify-center rounded-lg border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-accent"
                >
                  Manage Subscription
                </button>
              </form>
            ) : null}
          </Card>

          {usage ? (
            <Card className="space-y-4 border-border/60 p-6 shadow-lg">
              <div>
                <h2 className="text-xl font-semibold">Free Tier Usage</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your current workspace counts while you are still on the free plan.
                </p>
              </div>

              {usage.error ? (
                <p className="text-sm text-red-700 dark:text-rose-300">{usage.error}</p>
              ) : (
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Clients</span>
                    <span className="font-medium tabular-nums">
                      {usage.current?.clients ?? 0} / {usage.limits?.maxClients ?? 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Jobs</span>
                    <span className="font-medium tabular-nums">
                      {usage.current?.jobs ?? 0} / {usage.limits?.maxJobs ?? 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Invoices</span>
                    <span className="font-medium tabular-nums">
                      {usage.current?.invoices ?? 0} / {usage.limits?.maxInvoices ?? 0}
                    </span>
                  </div>
                </div>
              )}
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
