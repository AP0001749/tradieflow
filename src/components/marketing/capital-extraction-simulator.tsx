"use client";

import { useState } from "react";

import { Select } from "@/components/ui/select";
import { getPricingPlan, type PlanKey } from "@/lib/pricing";

const CURRENCY_FORMATTER = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
  maximumFractionDigits: 0,
});

const NUMBER_FORMATTER = new Intl.NumberFormat("en-AU", {
  maximumFractionDigits: 1,
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
  const [dailyVolume, setDailyVolume] = useState(150);
  const [conversionRate, setConversionRate] = useState(0.8);
  const [planKey, setPlanKey] = useState<PlanKey>("baseline");

  const selectedPlan = getPricingPlan(planKey);
  const monthlyLeadVolume = dailyVolume * 30;
  const projectedClients = monthlyLeadVolume * (conversionRate / 100);
  const mrr = projectedClients * selectedPlan.priceAud;
  const arr = mrr * 12;
  const valuation = arr * 10;
  const valuationProgress = Math.min((valuation / 5_000_000) * 100, 100);
  const clientsToFiveMillion = Math.ceil(5_000_000 / (selectedPlan.priceAud * 12 * 10));

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="rounded-[1.5rem] border border-border/70 bg-card/95 p-6 shadow-xl shadow-black/5 backdrop-blur">
        <div className="space-y-2">
          <p className="hero-pill">TradieFlow V2.0 Capital Simulator</p>
          <h3 className="tf-display text-3xl">Project MRR from the HVAC pivot</h3>
          <p className="text-sm text-muted-foreground">
            Adjust daily outreach volume, conversion rate, and subscription tier to
            model how quickly a focused emergency-trade pipeline compounds into ARR.
          </p>
        </div>

        <div className="mt-8 space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="daily-outreach-volume" className="text-sm font-medium">
                Daily Audit Outreach Volume
              </label>
              <span className="text-sm font-semibold tabular-nums">
                {dailyVolume}
              </span>
            </div>
            <input
              id="daily-outreach-volume"
              type="range"
              min={50}
              max={1000}
              step={1}
              value={dailyVolume}
              onChange={(event) => {
                setDailyVolume(Number(event.target.value));
              }}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
            />
            <p className="text-xs text-muted-foreground">
              Range: 50 to 1000 compliant, reviewed outbound touches per day.
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
              Range: 0.1% to 3.0% of contacted operators becoming customers.
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
              Total monthly recurring revenue
            </p>
            <div className="mt-3 text-4xl font-semibold tracking-tight">
              {CURRENCY_FORMATTER.format(mrr)}
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
                Monthly lead volume
              </p>
              <p className="mt-2 text-2xl font-semibold">
                {monthlyLeadVolume.toLocaleString("en-AU")}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-300">
                New clients / month
              </p>
              <p className="mt-2 text-2xl font-semibold">
                {NUMBER_FORMATTER.format(projectedClients)}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-300">
                Annual recurring revenue
              </p>
              <p className="mt-2 text-2xl font-semibold">
                {CURRENCY_FORMATTER.format(arr)}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-300">
                10x software valuation
              </p>
              <p className="mt-2 text-2xl font-semibold">
                {CURRENCY_FORMATTER.format(valuation)}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-medium text-sky-100">$5M valuation progress</span>
            <span className="tabular-nums text-sky-200">
              {valuationProgress.toFixed(1)}%
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-300 via-emerald-300 to-lime-200 transition-all duration-300"
              style={{ width: `${valuationProgress}%` }}
            />
          </div>
          <p className="text-xs text-slate-300">
            Target requires roughly {clientsToFiveMillion.toLocaleString("en-AU")} active
            {selectedPlan.name} customers at a 10x ARR software multiple.
          </p>
        </div>

        <div className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
          <p className="text-sm font-medium text-emerald-100">
            {getStatusLabel(mrr)}
          </p>
          <p className="mt-1 text-sm text-emerald-50/80">
            Formula: daily volume x 30 days x conversion rate x subscription tier.
            Valuation model: MRR x 12 months x 10x software multiple.
          </p>
        </div>
      </div>
    </div>
  );
}
