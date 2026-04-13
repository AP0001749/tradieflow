import type { DispatchPriority, ServiceWindow } from "@/types";

export const DISPATCH_PRIORITY_OPTIONS: Array<{
  value: DispatchPriority;
  label: string;
  description: string;
}> = [
  {
    value: "emergency",
    label: "Emergency",
    description: "Immediate response work that should sit at the top of the run sheet.",
  },
  {
    value: "same_day",
    label: "Same Day",
    description: "Needs a slot today but is not a full red-alert callout.",
  },
  {
    value: "scheduled",
    label: "Scheduled Run",
    description: "Booked work with a normal planned dispatch window.",
  },
  {
    value: "backlog",
    label: "Backlog",
    description: "Quoted, deferred, or lower-priority work waiting for a slot.",
  },
];

export const SERVICE_WINDOW_OPTIONS: Array<{
  value: ServiceWindow;
  label: string;
  description: string;
}> = [
  {
    value: "anytime",
    label: "Anytime",
    description: "No specific arrival window has been promised yet.",
  },
  {
    value: "morning",
    label: "Morning",
    description: "Prefer an early-day dispatch window.",
  },
  {
    value: "midday",
    label: "Midday",
    description: "Best fit for the middle of the day.",
  },
  {
    value: "afternoon",
    label: "Afternoon",
    description: "Booked for later in the standard workday.",
  },
  {
    value: "after_hours",
    label: "After Hours",
    description: "Booked outside the standard daytime dispatch window.",
  },
];

const prioritySortOrder: DispatchPriority[] = [
  "emergency",
  "same_day",
  "scheduled",
  "backlog",
];

export function getDispatchPriorityLabel(value?: string | null) {
  return (
    DISPATCH_PRIORITY_OPTIONS.find((option) => option.value === value)?.label ||
    "Not set"
  );
}

export function getServiceWindowLabel(value?: string | null) {
  return (
    SERVICE_WINDOW_OPTIONS.find((option) => option.value === value)?.label ||
    "Not set"
  );
}

export function getDispatchPriorityVariant(value?: string | null) {
  switch (value) {
    case "emergency":
      return "destructive" as const;
    case "same_day":
      return "in_progress" as const;
    case "scheduled":
      return "scheduled" as const;
    case "backlog":
      return "outline" as const;
    default:
      return "outline" as const;
  }
}

export function getDispatchPrioritySortRank(value?: string | null) {
  if (!value) {
    return prioritySortOrder.length + 1;
  }

  const index = prioritySortOrder.indexOf(value as DispatchPriority);
  return index === -1 ? prioritySortOrder.length + 1 : index;
}

export function inferDispatchPriorityFromJobType(
  jobType?: string | null,
): DispatchPriority | null {
  const normalized = jobType?.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  if (
    normalized.includes("emergency") ||
    normalized.includes("callout") ||
    normalized.includes("no power") ||
    normalized.includes("burst") ||
    normalized.includes("leak")
  ) {
    return "emergency";
  }

  if (
    normalized.includes("same day") ||
    normalized.includes("today") ||
    normalized.includes("urgent")
  ) {
    return "same_day";
  }

  if (
    normalized.includes("service") ||
    normalized.includes("maintenance") ||
    normalized.includes("quote")
  ) {
    return "backlog";
  }

  return "scheduled";
}

export function inferServiceWindowFromLeadPreference(
  value?: string | null,
): ServiceWindow | null {
  const normalized = value?.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  if (normalized.includes("morning") || normalized.includes("am")) {
    return "morning";
  }

  if (
    normalized.includes("midday") ||
    normalized.includes("noon") ||
    normalized.includes("lunch")
  ) {
    return "midday";
  }

  if (normalized.includes("afternoon") || normalized.includes("pm")) {
    return "afternoon";
  }

  if (
    normalized.includes("after hours") ||
    normalized.includes("after-hours") ||
    normalized.includes("evening") ||
    normalized.includes("night")
  ) {
    return "after_hours";
  }

  if (normalized.includes("anytime") || normalized.includes("flexible")) {
    return "anytime";
  }

  return null;
}
