export const DISPATCH_CHECK_IN_VALUES = [
  "awaiting_dispatch",
  "en_route",
  "on_site",
  "left_site",
] as const;

export const DISPATCH_CHECK_IN_OPTIONS = [
  {
    value: DISPATCH_CHECK_IN_VALUES[0],
    label: "Awaiting Dispatch",
    description: "Crew has not rolled yet or is waiting for assignment details.",
  },
  {
    value: DISPATCH_CHECK_IN_VALUES[1],
    label: "En Route",
    description: "Crew is travelling to site and may have an ETA note.",
  },
  {
    value: DISPATCH_CHECK_IN_VALUES[2],
    label: "On Site",
    description: "Crew has arrived and is actively working the job.",
  },
  {
    value: DISPATCH_CHECK_IN_VALUES[3],
    label: "Left Site",
    description: "Crew has wrapped on site and moved off the job.",
  },
] as const;

export function getDispatchCheckInLabel(value?: string | null) {
  return (
    DISPATCH_CHECK_IN_OPTIONS.find((option) => option.value === value)?.label ||
    "Awaiting Dispatch"
  );
}

export function getDispatchCheckInVariant(value?: string | null) {
  switch (value) {
    case "en_route":
      return "scheduled" as const;
    case "on_site":
      return "in_progress" as const;
    case "left_site":
      return "completed" as const;
    case "awaiting_dispatch":
    default:
      return "outline" as const;
  }
}

export function formatDispatchCheckInTimestamp(value?: string | null) {
  if (!value) {
    return "No crew check-in logged yet";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}
