"use client";

import { useMemo, useState } from "react";

import { Select } from "@/components/ui/select";
import { getPricingPlan, type PlanKey } from "@/lib/pricing";

const CURRENCY_FORMATTER = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
  maximumFractionDigits: 0,
});

function getStatusLabel(mrr: number) {
  if (mrr < 5000) {
    return "System Status: Tarneit Incubation";
  }

  if (mrr <= 20000) {
    return "System Status: Grid Escape Velocity";
  }

  return "System Status: Sovereign Apex";
}

export function CapitalExtractionSimulator() {
  const [dailyVolume, setDailyVolume] = useState(180);
  const [conversionRate, setConversionRate] = useState(0.8);
  const [planKey, setPlanKey] = useState<PlanKey>("baseline");

  const selectedPlan = getPricingPlan(planKey);

  const metrics = useMemo(() => {
    const mrr = dailyVolume * 30 * (conversionRate / 100) * selectedPlan.priceAud;
    const valuation = mrr * 12 * 10;
    const progress = Math.min((valuation / 5_000_000) * 100, 100);
    const newClientsPerMonth = dailyVolume * 30 * (conversionRate / 100);

    return {
      mrr,
      valuation,
      progress,
      newClientsPerMonth,
    };
  }, [conversionRate, dailyVolume, selectedPlan.priceAud]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="rounded-[1.5rem] border border-border/70 bg-card/95 p-6 shadow-xl shadow-black/5 backdrop-blur">
        <div className="space-y-2">
          <p className="hero-pill">Capital Extraction Simulator</p>
          <h3 className="tf-display text-3xl">Pressure-test the HVAC pivot</h3>
          <p className="text-sm text-muted-foreground">
            Adjust outbound volume, conversion rate, and subscription tier to model the
            monthly compounding effect of the Zero-Leak Funnel.
          </p>
        </div>

        <div className="mt-8 space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="daily-locust-volume" className="text-sm font-medium">
                Daily Locust Volume (SMS Sent)
              </label>
              <span className="text-sm font-semibold tabular-nums">{dailyVolume}</span>
            </div>
            <input
              id="daily-locust-volume"
              type="range"
              min={50}
              max={1000}
              step={10}
              value={dailyVolume}
              onChange={(event) => {
                setDailyVolume(Number(event.target.value));
              }}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
            />
            <p className="text-xs text-muted-foreground">
              Range: 50 to 1000 daily touches
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="lead-conversion-rate" className="text-sm font-medium">
                Lead Conversion Rate
              </label>
              <span className="text-sm font-semibold tabular-nums">
                {conversionRate.toFixed(1)}%
              </span>
            </div>
            <input
              id="lead-conversion-rate"
              type="range"
              min={0.1}
              max={3}
              step={0.1}
              value={conversionRate}
              onChange={(event) => {
                setConversionRate(Number(event.target.value));
              }}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
            />
            <p className="text-xs text-muted-foreground">
              Range: 0.1% to 3.0%
            </p>
          </div>

          <div className="space-y-3">
            <label htmlFor="subscription-tier" className="text-sm font-medium">
              Monthly Subscription Tier
            </label>
            <Select
              id="subscription-tier"
              value={planKey}
              onChange={(event) => {
                setPlanKey(event.target.value === "apex" ? "apex" : "baseline");
              }}
            >
              <option value="baseline">$299 AUD (Baseline)</option>
              <option value="apex">$499 AUD (Apex)</option>
            </Select>
          </div>
        </div>
      </div>

      <div className="rounded-[1.5rem] border border-sky-500/20 bg-slate-950 p-6 text-slate-50 shadow-2xl shadow-sky-950/20">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-sky-200/70">
              Monthly recurring revenue
            </p>
            <div className="mt-3 text-4xl font-semibold tracking-tight">
              {CURRENCY_FORMATTER.format(metrics.mrr)}
            </div>
          </div>
          <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-sky-100">
            {selectedPlan.name}
          </div>
        </div>

        <div className="mt-8 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-300">
                New clients / month
              </p>
              <p className="mt-2 text-2xl font-semibold">
                {metrics.newClientsPerMonth.toFixed(1)}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-300">
                Implied valuation
              </p>
              <p className="mt-2 text-2xl font-semibold">
                {CURRENCY_FORMATTER.format(metrics.valuation)}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="text-slate-300">$5M Sovereign Valuation</span>
              <span className="font-semibold text-sky-100">
                {metrics.progress.toFixed(1)}%
              </span>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-400 via-cyan-300 to-emerald-300 transition-[width] duration-300"
                style={{ width: `${metrics.progress}%` }}
              />
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
          <p className="text-sm font-medium text-emerald-100">{getStatusLabel(metrics.mrr)}</p>
          <p className="mt-1 text-sm text-emerald-50/80">
            Formula: 30 days x daily volume x conversion rate x subscription tier.
          </p>
        </div>
      </div>
    </div>
  );
}
