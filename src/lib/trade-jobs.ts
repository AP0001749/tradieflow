import type { TradeVertical, WarrantyStatus } from "@/types";

export const TRADE_VERTICAL_OPTIONS: Array<{
  value: TradeVertical;
  label: string;
}> = [
  { value: "hvac", label: "HVAC" },
  { value: "plumbing", label: "Plumbing" },
  { value: "electrical", label: "Electrical" },
  { value: "mixed_trade", label: "Mixed Trade" },
];

export const WARRANTY_STATUS_OPTIONS: Array<{
  value: WarrantyStatus;
  label: string;
}> = [
  { value: "in_warranty", label: "In Warranty" },
  { value: "out_of_warranty", label: "Out of Warranty" },
  { value: "unknown", label: "Warranty Unknown" },
];

export function getTradeVerticalLabel(value?: string | null) {
  return (
    TRADE_VERTICAL_OPTIONS.find((option) => option.value === value)?.label ||
    "Not set"
  );
}

export function getWarrantyStatusLabel(value?: string | null) {
  return (
    WARRANTY_STATUS_OPTIONS.find((option) => option.value === value)?.label ||
    "Not set"
  );
}

export function inferTradeVerticalFromJobType(
  jobType?: string | null,
): TradeVertical | null {
  const normalized = jobType?.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  if (
    normalized.includes("split system") ||
    normalized.includes("ducted") ||
    normalized.includes("heating") ||
    normalized.includes("cooling") ||
    normalized.includes("air")
  ) {
    return "hvac";
  }

  if (
    normalized.includes("drain") ||
    normalized.includes("plumb") ||
    normalized.includes("hot water") ||
    normalized.includes("leak")
  ) {
    return "plumbing";
  }

  if (
    normalized.includes("switchboard") ||
    normalized.includes("electrical") ||
    normalized.includes("spark") ||
    normalized.includes("power")
  ) {
    return "electrical";
  }

  if (
    normalized.includes("emergency") ||
    normalized.includes("service") ||
    normalized.includes("maintenance")
  ) {
    return "mixed_trade";
  }

  return null;
}
