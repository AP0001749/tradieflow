import Link from "next/link";
import type { Metadata } from "next";
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
  Clock,
  BarChart3,
  MapPin,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { CapitalExtractionSimulator } from "@/components/marketing/capital-extraction-simulator";
import { getPricingPlans } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "TradieFlow — CRM & Automation for Australian Tradies",
  description:
    "Stop losing leads. TradieFlow turns missed calls into booked jobs with instant SMS textback, automated follow-ups, and AI-powered dispatch — built for Australian trade businesses.",
  keywords: [
    "tradie CRM",
    "trade business software",
    "missed call text back",
    "Australian tradie app",
    "job management software",
    "plumber electrician CRM",
    "tradesman software",
    "dispatch software Australia",
  ],
  openGraph: {
    title: "TradieFlow — CRM & Automation for Australian Tradies",
    description:
      "Stop losing leads. TradieFlow turns missed calls into booked jobs with instant SMS textback, automated follow-ups, and AI-powered dispatch.",
    type: "website",
    locale: "en_AU",
  },
  twitter: {
    card: "summary_large_image",
    title: "TradieFlow — CRM & Automation for Australian Tradies",
    description:
      "Stop losing leads. TradieFlow turns missed calls into booked jobs with instant SMS textback, automated follow-ups, and AI-powered dispatch.",
  },
};

export default function Home() {
  const plans = getPricingPlans();

  const zeroLeakSystems = [
    {
      icon: PhoneCall,
      title: "Missed Call Text Back",
      number: "01",
      description:
        "If the phone rings out, TradieFlow answers with an instant SMS so the job does not leak to the next contractor.",
    },
    {
      icon: ClipboardCheck,
      title: "Quote Nurture",
      number: "02",
      description:
        "Forty-eight-hour follow-up prompts keep install quotes moving instead of going stale in the van.",
    },
    {
      icon: Star,
      title: "Review Extractor",
      number: "03",
      description:
        "After payment lands, TradieFlow nudges happy customers toward a direct Google review link.",
    },
  ];

  const verticals = [
    { icon: Snowflake, label: "HVAC & refrigeration" },
    { icon: Wrench, label: "Emergency plumbing" },
    { icon: Zap, label: "Electrical & sparkies" },
  ];

  const rolloutLayers = [
    {
      icon: Shield,
      accent: "from-sky-500 to-cyan-500",
      title: "Dispatch Audit",
      description:
        "Map missed-call leaks, after-hours coverage, and service-area handoff points before a single workflow goes live.",
    },
    {
      icon: ClipboardCheck,
      accent: "from-emerald-500 to-teal-500",
      title: "Done-For-You Onboarding",
      description:
        "TradieFlow sets up the missed-call text-back, quote nurture, and review flow so the tradie does not burn hours in admin menus.",
    },
    {
      icon: TrendingUp,
      accent: "from-violet-500 to-purple-500",
      title: "Quote-to-Invoice Handoff",
      description:
        "Keep the revenue path connected from lead capture through jobs and invoicing instead of losing momentum after the site visit.",
    },
  ];

  const proofStats = [
    { icon: Clock,    stat: "15 sec",  label: "SMS response on missed calls" },
    { icon: ClipboardCheck, stat: "48 hr", label: "Quote follow-up window" },
    { icon: MapPin,   stat: "Full AU", label: "Coverage for trade operators" },
    { icon: BarChart3, stat: "$0",     label: "Setup fee, AUD-only pricing" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* ─── Sticky Navbar ─── */}
      <header className="tf-nav sticky top-0 z-50" data-print-hidden="true">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between gap-4">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-emerald-500 shadow-sm">
                <Zap className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold tracking-tight text-gradient-tf">
                TradieFlow
              </span>
            </Link>

            {/* Nav links */}
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
              <a href="#features" className="hover:text-foreground transition-colors">Features</a>
              <a href="#how-it-works" className="hover:text-foreground transition-colors">How it works</a>
              <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-3 shrink-0">
              <ThemeToggle />
              <Link
                href="/login"
                className="hidden sm:block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:-translate-y-px hover:shadow-md"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden hero-gradient-bg border-b border-border">
        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        <div className="relative container mx-auto px-4 pb-20 pt-20 md:pb-28 md:pt-28">
          <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-8">
              <div className="space-y-5">
                <div className="flex items-center gap-2">
                  <span className="hero-pill">Zero-Leak Funnel v2.0</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
                    Live in AU
                  </span>
                </div>
                <h1 className="tf-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-[4rem] xl:text-[4.5rem]">
                  Stop losing emergency jobs to{" "}
                  <span className="text-gradient-tf">missed calls.</span>
                </h1>
                <p className="max-w-xl text-lg leading-relaxed text-muted-foreground md:text-xl">
                  Built for HVAC, plumbing, and electrical teams. TradieFlow catches missed calls in 15 seconds, keeps quotes moving, and turns paid jobs into Google reviews — automatically.
                </p>
              </div>

              {/* Vertical badges */}
              <div className="flex flex-wrap gap-2">
                {verticals.map((vertical) => (
                  <div
                    key={vertical.label}
                    className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-4 py-2 text-sm font-medium shadow-sm backdrop-blur"
                  >
                    <vertical.icon className="h-3.5 w-3.5 text-primary" />
                    <span>{vertical.label}</span>
                  </div>
                ))}
              </div>

              {/* CTAs */}
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/book"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-primary px-8 text-base font-semibold text-primary-foreground shadow-md transition-all hover:bg-primary/90 hover:-translate-y-0.5 hover:shadow-lg"
                >
                  Request Free Dispatch Audit
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex h-12 items-center justify-center rounded-lg border border-input bg-background/80 px-8 text-base font-semibold text-foreground backdrop-blur transition-all hover:bg-accent hover:border-primary/30"
                >
                  Create Account Free
                </Link>
              </div>

              {/* Social proof */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>No setup fee</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>AUD billing</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Cancel anytime</span>
                </div>
              </div>
            </div>

            {/* Hero dark card */}
            <div className="relative">
              <div className="absolute -left-10 top-8 hidden h-40 w-40 rounded-full bg-sky-400/20 blur-3xl lg:block" />
              <div className="absolute -right-4 bottom-8 hidden h-32 w-32 rounded-full bg-emerald-400/20 blur-3xl lg:block" />
              <Card className="relative overflow-hidden rounded-[1.75rem] border-slate-900/5 bg-slate-950 p-0 text-slate-50 shadow-2xl shadow-slate-950/30 dark:shadow-slate-950/60">
                <div className="border-b border-white/10 px-6 py-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-sky-200/60">
                        Emergency Trade Recovery
                      </p>
                      <h2 className="mt-2 text-xl font-semibold leading-tight">
                        Disaster mitigation, not admin convenience
                      </h2>
                    </div>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20">
                      <Shield className="h-5 w-5 text-emerald-300" />
                    </div>
                  </div>
                </div>
                <div className="space-y-3 p-6">
                  {[
                    {
                      label: "Missed call detected",
                      detail: "Incoming call rings out after 15 seconds.",
                      icon: PhoneCall,
                      color: "text-sky-300",
                      bg: "bg-sky-400/15",
                    },
                    {
                      label: "TradieFlow replies instantly",
                      detail: "Emergency-safe SMS keeps the homeowner engaged.",
                      icon: MessageSquare,
                      color: "text-violet-300",
                      bg: "bg-violet-400/15",
                    },
                    {
                      label: "Lead captured in workspace",
                      detail: "Dispatch, quote, and invoice history stay connected.",
                      icon: TrendingUp,
                      color: "text-emerald-300",
                      bg: "bg-emerald-400/15",
                    },
                  ].map((step, index) => (
                    <div
                      key={step.label}
                      className="flex gap-4 rounded-xl border border-white/8 bg-white/[0.04] p-4 transition-colors hover:bg-white/[0.07]"
                    >
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${step.bg} ${step.color}`}>
                        <step.icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-[0.65rem] uppercase tracking-[0.24em] text-slate-400">
                          Step {index + 1}
                        </p>
                        <h3 className="mt-0.5 text-sm font-semibold leading-snug">{step.label}</h3>
                        <p className="mt-0.5 text-xs text-slate-400 leading-relaxed">{step.detail}</p>
                      </div>
                    </div>
                  ))}

                  <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-xs leading-relaxed text-emerald-100/90">
                    During a heatwave breakdown, burst pipe, or outage callout, an unanswered call is a lost job. TradieFlow exists to plug that leak.
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Social proof strip ─── */}
      <section className="proof-strip py-10" aria-label="Platform statistics">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 gap-px md:grid-cols-4 overflow-hidden rounded-xl border border-white/10">
            {proofStats.map((item) => (
              <div
                key={item.label}
                className="flex flex-col items-center gap-1.5 bg-slate-900 px-6 py-6 text-center"
              >
                <item.icon className="h-5 w-5 text-sky-400 mb-0.5" />
                <span className="text-2xl font-bold text-white tracking-tight">{item.stat}</span>
                <span className="text-xs text-slate-400 leading-snug">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Zero-Leak Systems ─── */}
      <section id="features" className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl space-y-3 text-center">
            <p className="hero-pill">Zero-Leak Systems</p>
            <h2 className="tf-display text-3xl font-bold md:text-4xl lg:text-5xl">
              The software payload is single-purpose
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Strip away low-ticket admin fluff. Keep only the systems that recover urgency, follow through on quotes, and grow local proof.
            </p>
          </div>

          <div className="mx-auto mt-14 grid max-w-6xl gap-6 md:grid-cols-3">
            {zeroLeakSystems.map((system) => (
              <div key={system.title} className="relative group">
                <div className="feature-number">{system.number}</div>
                <Card className="relative h-full space-y-4 p-7 border-border/60 transition-all duration-300 group-hover:shadow-[var(--shadow-glow)] group-hover:-translate-y-1">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
                    <system.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold">{system.title}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {system.description}
                    </p>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Go-Live Stack ─── */}
      <section id="how-it-works" className="border-y border-border bg-muted/20 py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl space-y-3 text-center">
            <p className="hero-pill">Go-Live Stack</p>
            <h2 className="tf-display text-3xl font-bold md:text-4xl lg:text-5xl">
              Sell the audit, then deploy the workflow for them
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              HVAC, plumbing, and electrical owners do not want another dashboard lecture. They want someone to find the leak, tighten the routing, and stand up the system fast.
            </p>
          </div>

          <div className="mx-auto mt-14 grid max-w-6xl gap-6 md:grid-cols-3">
            {rolloutLayers.map((layer) => (
              <Card
                key={layer.title}
                className="relative overflow-hidden border-border/60 p-7 space-y-4 transition-all duration-300 hover:shadow-[var(--shadow-elevated)] hover:-translate-y-1"
              >
                {/* Accent left bar */}
                <div className={`absolute left-0 top-0 h-full w-1 rounded-l-[inherit] bg-gradient-to-b ${layer.accent}`} />
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${layer.accent} shadow-sm`}>
                  <layer.icon className="h-6 w-6 text-white" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold">{layer.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {layer.description}
                  </p>
                </div>
              </Card>
            ))}
          </div>

          <p className="mx-auto mt-10 max-w-2xl text-center text-sm text-muted-foreground/70">
            Continuous GPS van tracking is not live in the current product. The platform supports technician field check-in links with optional browser GPS capture.
          </p>
        </div>
      </section>

      {/* ─── Revenue Simulator ─── */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl space-y-3 text-center">
            <p className="hero-pill">Revenue Modeller</p>
            <h2 className="tf-display text-3xl font-bold md:text-4xl lg:text-5xl">
              How much revenue are you leaving on the table?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Dial in your daily outreach volume, conversion rate, and subscription tier to see what a plugged funnel actually means in AUD.
            </p>
          </div>

          <div className="mx-auto mt-12 max-w-6xl">
            <CapitalExtractionSimulator />
          </div>
        </div>
      </section>

      {/* ─── Pricing ─── */}
      <section id="pricing" className="border-y border-border bg-muted/20 py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl space-y-3 text-center">
            <p className="hero-pill">Pricing Matrix</p>
            <h2 className="tf-display text-3xl font-bold md:text-4xl lg:text-5xl">
              Priced like the revenue it protects
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Both plans cover high-urgency infrastructure trades. One recovered emergency job pays for months of TradieFlow.
            </p>
          </div>

          <div className="mx-auto mt-14 grid max-w-4xl gap-6 lg:grid-cols-2">
            {plans.map((plan) => (
              <div
                key={plan.key}
                className={`relative rounded-[1.5rem] border p-8 bg-card transition-all duration-300 ${
                  plan.key === "apex"
                    ? "apex-glow border-primary/30"
                    : "border-border/80 hover:shadow-[var(--shadow-elevated)]"
                }`}
              >
                {plan.key === "apex" && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1 text-xs font-bold uppercase tracking-widest text-primary-foreground shadow-md">
                      <Star className="h-3 w-3" />
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-2xl font-bold">{plan.name}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {plan.blurb}
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex items-end gap-2">
                  <span className="text-5xl font-bold tracking-tight text-gradient-tf">
                    ${plan.priceAud}
                  </span>
                  <span className="pb-2 text-sm text-muted-foreground">AUD / month</span>
                </div>

                <Link
                  href="/signup"
                  className={`mt-7 flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all hover:-translate-y-0.5 ${
                    plan.key === "apex"
                      ? "bg-primary text-primary-foreground shadow-md hover:bg-primary/90 hover:shadow-lg"
                      : "border border-input bg-background hover:bg-accent hover:border-primary/30"
                  }`}
                >
                  Get started with {plan.name}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>

                <div className="mt-8 space-y-3">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      <span className="text-sm text-foreground leading-relaxed">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <p className="mt-8 text-center text-sm text-muted-foreground/60">
            At $299 AUD/month, ~28 active Baseline clients = $100k+ ARR. Priced for high-urgency jobs and the revenue at risk when calls go unanswered.
          </p>
        </div>
      </section>

      {/* ─── Bottom CTA ─── */}
      <section className="cta-dark py-24 md:py-32">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-sky-400 mb-8">
              <Zap className="h-3 w-3" />
              Start the Pivot
            </span>
            <h2 className="tf-display mt-2 text-4xl font-bold text-white md:text-5xl lg:text-6xl leading-[1.1]">
              Launch the{" "}
              <span className="text-gradient-tf">Zero-Leak Funnel</span>{" "}
              before the next callout leak hits
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg text-slate-400">
              Reposition the site, capture dispatch-audit demand, and onboard emergency-trade operators into the new workflow — done for you.
            </p>
            <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
              <Link
                href="/book"
                className="inline-flex h-13 items-center justify-center gap-2 rounded-xl bg-primary px-10 py-3.5 text-base font-bold text-primary-foreground shadow-lg shadow-primary/30 transition-all hover:bg-primary/90 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/35"
              >
                Request Dispatch Audit
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/signup"
                className="inline-flex h-13 items-center justify-center rounded-xl border border-white/20 bg-white/5 px-10 py-3.5 text-base font-semibold text-white backdrop-blur transition-all hover:bg-white/10 hover:border-white/30"
              >
                Create Free Account
              </Link>
            </div>
            <p className="mt-6 text-sm text-slate-500">
              Built for Australian operators who cannot afford to lose an emergency lead.
            </p>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-border bg-background py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
            {/* Brand */}
            <div className="space-y-2">
              <Link href="/" className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-emerald-500">
                  <Zap className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="font-bold text-gradient-tf">TradieFlow</span>
              </Link>
              <p className="text-xs text-muted-foreground max-w-[200px] leading-relaxed">
                CRM & automation for Australian emergency-trade businesses.
              </p>
            </div>

            {/* Links */}
            <div className="flex flex-wrap gap-x-8 gap-y-4 text-sm text-muted-foreground">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-foreground">Product</p>
                <div className="flex flex-col gap-1.5">
                  <a href="#features" className="hover:text-foreground transition-colors">Features</a>
                  <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
                  <Link href="/book" className="hover:text-foreground transition-colors">Dispatch Audit</Link>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-foreground">Account</p>
                <div className="flex flex-col gap-1.5">
                  <Link href="/login" className="hover:text-foreground transition-colors">Sign In</Link>
                  <Link href="/signup" className="hover:text-foreground transition-colors">Create Account</Link>
                  <Link href="/dashboard/billing" className="hover:text-foreground transition-colors">Billing</Link>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-foreground">Legal</p>
                <div className="flex flex-col gap-1.5">
                  <Link href="/legal/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
                  <Link href="/legal/terms" className="hover:text-foreground transition-colors">Terms</Link>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 border-t border-border pt-6 text-center text-xs text-muted-foreground">
            &copy; 2026 TradieFlow Pty Ltd. Built for Australian emergency-trade businesses.
          </div>
        </div>
      </footer>
    </div>
  );
}
