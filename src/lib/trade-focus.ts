import type { TradeVertical } from "@/types";
import { TRADE_VERTICAL_OPTIONS } from "@/lib/trade-jobs";

export const PRIMARY_TRADE_FOCUS_OPTIONS = TRADE_VERTICAL_OPTIONS;

export function normalizeTradeFocus(value?: string | null): TradeVertical {
  if (
    value === "hvac" ||
    value === "plumbing" ||
    value === "electrical" ||
    value === "mixed_trade"
  ) {
    return value;
  }

  return "mixed_trade";
}

export function getTradeFocusLabel(value?: string | null) {
  const normalized = normalizeTradeFocus(value);

  return (
    PRIMARY_TRADE_FOCUS_OPTIONS.find((option) => option.value === normalized)?.label ||
    "Mixed Trade"
  );
}

export function getTradeFocusAudienceLabel(value?: string | null) {
  switch (normalizeTradeFocus(value)) {
    case "hvac":
      return "HVAC and refrigeration";
    case "plumbing":
      return "plumbing";
    case "electrical":
      return "electrical";
    default:
      return "multi-trade";
  }
}

export function getTradeFocusMarketingLabel(value?: string | null) {
  switch (normalizeTradeFocus(value)) {
    case "hvac":
      return "HVAC";
    case "plumbing":
      return "Plumbing";
    case "electrical":
      return "Electrical";
    default:
      return "Multi-Trade";
  }
}
