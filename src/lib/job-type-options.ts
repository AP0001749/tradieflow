import type { TradeVertical } from "@/types";
import { normalizeTradeFocus } from "@/lib/trade-focus";

const FALLBACK_JOB_TYPE_OPTIONS: Record<TradeVertical, string[]> = {
  hvac: [
    "Split System Install",
    "Ducted Repair",
    "Heating Service",
    "Cooling Breakdown",
    "Refrigeration Fault",
    "Service & Maintenance",
  ],
  plumbing: [
    "Blocked Drain",
    "Hot Water Service",
    "Burst Pipe",
    "Emergency Leak",
    "Toilet Repair",
    "Service & Maintenance",
  ],
  electrical: [
    "Switchboard Fault",
    "Power Loss",
    "Smoke Alarm Install",
    "RCD Fault",
    "Lighting Repair",
    "Service & Maintenance",
  ],
  mixed_trade: [
    "Emergency Callout",
    "Split System Install",
    "Blocked Drain",
    "Switchboard Fault",
    "Hot Water Service",
    "Service & Maintenance",
  ],
};

export function getTradeFocusJobTypePresets(tradeFocus?: string | null) {
  return FALLBACK_JOB_TYPE_OPTIONS[normalizeTradeFocus(tradeFocus)];
}

const ACRONYM_MAP: Record<string, string> = {
  hvac: "HVAC",
  ac: "AC",
  rcd: "RCD",
  cctv: "CCTV",
  ev: "EV",
};

function titleCaseToken(token: string) {
  const normalized = token.toLowerCase();
  if (ACRONYM_MAP[normalized]) {
    return ACRONYM_MAP[normalized];
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export function formatJobTypeLabel(value: string) {
  const cleaned = value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) {
    return "";
  }

  return cleaned
    .split(" ")
    .map(titleCaseToken)
    .join(" ");
}

export function getPublicJobTypeOptions(
  value?: string[] | null,
  tradeFocus?: string | null,
) {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const item of value || []) {
    const label = formatJobTypeLabel(item);
    const dedupeKey = label.toLowerCase();

    if (!label || seen.has(dedupeKey)) {
      continue;
    }

    seen.add(dedupeKey);
    normalized.push(label);
  }

  if (normalized.length > 0) {
    return normalized;
  }

  return getTradeFocusJobTypePresets(tradeFocus);
}
