import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  MessageSquare,
  PhoneCall,
  Shield,
  Snowflake,
  Star,
  TrendingUp,
  Wrench,
  Zap,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { CapitalExtractionSimulator } from "@/components/marketing/capital-extraction-simulator";
import { getPricingPlans } from "@/lib/pricing";

export default function Home() {
  const plans = getPricingPlans();

  const zeroLeakSystems = [
    {
      icon: PhoneCall,
      title: "Missed Call Text Back",
      description:
        "If the phone rings out, TradieFlow answers with an instant SMS so the job does not leak to the next contractor.",
    },
    {
      icon: ClipboardCheck,
      title: "Quote Nurture",
      description:
        "Forty-eight-hour follow-up prompts keep install quotes moving instead of going stale in the van.",
    },
    {
      icon: Star,
      title: "Review Extractor",
      description:
        "After payment lands, TradieFlow nudges happy customers toward a direct Google review link.",
    },
  ];

  const verticals = [
    { icon: Snowflake, label: "HVAC & refrigeration" },
    { icon: Wrench, label: "Emergency plumbing" },
    { icon: Zap, label: "Electrical & sparkies" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="fixed right-4 top-4 z-20">
        <ThemeToggle />
      </div>

      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.22),_transparent_34%),radial-gradient(circle_at_82%_12%,_rgba(34,197,94,0.14),_transparent_28%),linear-gradient(180deg,_rgba(15,23,42,0.02),_transparent_70%)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.26),_transparent_30%),radial-gradient(circle_at_82%_12%,_rgba(16,185,129,0.16),_transparent_24%),linear-gradient(180deg,_rgba(15,23,42,0.45),_transparent_72%)]" />

        <div className="relative container mx-auto px-4 pb-20 pt-24 md:pb-28 md:pt-32">
          <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-7">
              <div className="space-y-4">
                <p className="hero-pill">TradieFlow V2.0 • Zero-Leak Funnel</p>
                <h1 className="tf-display text-5xl font-bold tracking-tight text-foreground md:text-6xl lg:text-7xl">
                  Stop emergency jobs from leaking after the second ring.
                </h1>
                <p className="max-w-2xl text-lg leading-8 text-foreground/80 md:text-xl">
                  TradieFlow is now built for HVAC, plumbers, and sparkies who lose
                  high-ticket work when they are under a house, on a roof, or deep in a
                  switchboard. The platform turns missed calls into active conversations,
                  quote follow-up, and review growth.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                {verticals.map((vertical) => (
                  <div
                    key={vertical.label}
                    className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-4 py-2 text-sm font-medium shadow-sm backdrop-blur"
                  >
                    <vertical.icon className="h-4 w-4 text-primary" />
                    <span>{vertical.label}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/book"
                  className="inline-flex h-12 items-center justify-center rounded-lg bg-primary px-8 text-base font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                >
                  Request Zero-Leak Demo
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex h-12 items-center justify-center rounded-lg border border-input bg-background px-8 text-base font-semibold text-foreground transition-colors hover:bg-accent"
                >
                  Create Account
                </Link>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  "15-second missed-call response",
                  "48-hour quote follow-up",
                  "24-hour review extraction",
                ].map((proof) => (
                  <div
                    key={proof}
                    className="rounded-2xl border border-border/70 bg-background/75 px-4 py-3 text-sm text-muted-foreground shadow-sm backdrop-blur"
                  >
                    <span className="font-semibold text-foreground">{proof}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute -left-10 top-8 hidden h-32 w-32 rounded-full bg-sky-400/20 blur-3xl lg:block" />
              <Card className="relative overflow-hidden rounded-[1.75rem] border-slate-900/5 bg-slate-950 p-0 text-slate-50 shadow-2xl shadow-slate-950/20">
                <div className="border-b border-white/10 px-6 py-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-sky-200/70">
                        HVAC Lead Recovery
                      </p>
                      <h2 className="mt-2 text-2xl font-semibold">
                        Disaster mitigation, not admin convenience
                      </h2>
                    </div>
                    <Shield className="h-6 w-6 text-emerald-300" />
                  </div>
                </div>
                <div className="space-y-4 p-6">
                  {[
                    {
                      label: "Missed call detected",
                      detail: "Incoming call rings out after 15 seconds.",
                      icon: PhoneCall,
                    },
                    {
                      label: "TradieFlow replies instantly",
                      detail: "Emergency-safe SMS keeps the homeowner engaged.",
                      icon: MessageSquare,
                    },
                    {
                      label: "Lead captured in workspace",
                      detail: "Dispatch, quote, and invoice history stay connected.",
                      icon: TrendingUp,
                    },
                  ].map((step, index) => (
                    <div
                      key={step.label}
                      className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-4"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-400/15 text-sky-200">
                        <step.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                          Step {index + 1}
                        </p>
                        <h3 className="mt-1 text-base font-semibold">{step.label}</h3>
                        <p className="mt-1 text-sm text-slate-300">{step.detail}</p>
                      </div>
                    </div>
                  ))}

                  <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-50">
                    During a Melbourne heatwave or winter breakdown, an unanswered phone
                    call is a revenue leak. TradieFlow exists to plug it.
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 md:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl space-y-3 text-center">
            <h2 className="tf-display text-3xl font-bold md:text-4xl">
              The software payload is now single-purpose
            </h2>
            <p className="text-lg text-muted-foreground">
              Strip away low-ticket admin fluff. Keep the systems that recover urgency,
              follow through on quotes, and grow local proof.
            </p>
          </div>

          <div className="mx-auto mt-12 grid max-w-6xl gap-6 md:grid-cols-3">
            {zeroLeakSystems.map((system) => (
              <Card key={system.title} className="space-y-4 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                  <system.icon className="h-6 w-6 text-primary" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold">{system.title}</h3>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {system.description}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-muted/30 py-20 md:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl space-y-3 text-center">
            <p className="hero-pill">Unit Economics</p>
            <h2 className="tf-display text-3xl font-bold md:text-4xl">
              Watch the outreach math compound in real time
            </h2>
          </div>

          <div className="mx-auto mt-12 max-w-6xl">
            <CapitalExtractionSimulator />
          </div>
        </div>
      </section>

      <section className="py-20 md:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl space-y-3 text-center">
            <p className="hero-pill">Pricing Matrix</p>
            <h2 className="tf-display text-3xl font-bold md:text-4xl">
              Price the platform like the revenue it protects
            </h2>
            <p className="text-lg text-muted-foreground">
              Both plans are positioned for high-urgency infrastructure trades, not
              low-value admin convenience.
            </p>
          </div>

          <div className="mx-auto mt-12 grid max-w-5xl gap-6 lg:grid-cols-2">
            {plans.map((plan) => (
              <Card
                key={plan.key}
                className={`rounded-[1.5rem] border p-8 ${
                  plan.key === "apex"
                    ? "border-primary/30 bg-primary/5 shadow-xl shadow-primary/10"
                    : "border-border/80"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-2xl font-semibold">{plan.name}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {plan.blurb}
                    </p>
                  </div>
                  {plan.key === "apex" ? (
                    <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-primary-foreground">
                      Higher leverage
                    </span>
                  ) : null}
                </div>

                <div className="mt-6 flex items-end gap-2">
                  <span className="text-5xl font-semibold tracking-tight">
                    ${plan.priceAud}
                  </span>
                  <span className="pb-2 text-muted-foreground">AUD / month</span>
                </div>

                <div className="mt-8 space-y-3">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                      <span className="text-sm text-foreground">{feature}</span>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>

          <div className="mx-auto mt-10 max-w-4xl rounded-[1.5rem] border border-border/70 bg-card px-6 py-5 text-sm text-muted-foreground shadow-sm">
            At $299 AUD per month, roughly 28 active HVAC clients equates to just over
            $100k ARR. The pricing has been repositioned to match high-urgency jobs and
            the revenue at risk when calls go unanswered.
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-muted/20 py-20 md:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl rounded-[2rem] border border-border/70 bg-card p-8 text-center shadow-xl shadow-black/5 md:p-12">
            <p className="hero-pill">Start the Pivot</p>
            <h2 className="tf-display mt-4 text-3xl font-bold md:text-5xl">
              Launch the Zero-Leak Funnel before the next heatwave hits
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              Reposition the site, capture demo demand, and onboard emergency-trade
              operators into the new workflow.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/book"
                className="inline-flex h-12 items-center justify-center rounded-lg bg-primary px-8 text-base font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
              >
                Request Zero-Leak Demo
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link
                href="/dashboard/billing"
                className="inline-flex h-12 items-center justify-center rounded-lg border border-input bg-background px-8 text-base font-semibold text-foreground transition-colors hover:bg-accent"
              >
                View Pricing Inside Dashboard
              </Link>
            </div>
            <p className="mt-5 text-sm text-muted-foreground">
              Built for Australian operators who cannot afford to lose an emergency lead.
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-between gap-4 text-sm text-muted-foreground sm:flex-row">
            <div>&copy; 2026 TradieFlow. Built for Australian emergency-trade businesses.</div>
            <div className="flex gap-6">
              <Link href="/legal/privacy" className="hover:text-foreground">
                Privacy
              </Link>
              <Link href="/legal/terms" className="hover:text-foreground">
                Terms
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
