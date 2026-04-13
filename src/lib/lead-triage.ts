export const LEAD_URGENCY_VALUES = [
  "emergency",
  "same_day",
  "scheduled",
  "quote",
] as const;

export const LEAD_URGENCY_OPTIONS = [
  {
    value: LEAD_URGENCY_VALUES[0],
    label: "Emergency",
    description: "Water, no heating/cooling, electrical fault, or safety-sensitive failure.",
    slaMinutes: 15,
  },
  {
    value: LEAD_URGENCY_VALUES[1],
    label: "Same Day",
    description: "Needs a technician today, but the site is stable.",
    slaMinutes: 60,
  },
  {
    value: LEAD_URGENCY_VALUES[2],
    label: "Scheduled",
    description: "Bookable work that can be handled in the normal run sheet.",
    slaMinutes: 240,
  },
  {
    value: LEAD_URGENCY_VALUES[3],
    label: "Quote / Install",
    description: "High-ticket quote request or non-urgent install discussion.",
    slaMinutes: 1440,
  },
] as const;

export type LeadUrgency = (typeof LEAD_URGENCY_OPTIONS)[number]["value"];
export type LeadResponseSlaMinutes = Partial<Record<LeadUrgency, number | null>>;

export const DEFAULT_LEAD_RESPONSE_SLA_MINUTES: Record<LeadUrgency, number> = {
  emergency: 15,
  same_day: 60,
  scheduled: 240,
  quote: 1440,
};

const urgencyKeywords: Record<LeadUrgency, string[]> = {
  emergency: [
    "emergency",
    "burst",
    "flood",
    "leak",
    "no heat",
    "no heating",
    "no cooling",
    "no air",
    "heatwave",
    "gas",
    "sparking",
    "smoke",
    "switchboard",
    "power out",
  ],
  same_day: [
    "blocked",
    "fault",
    "repair",
    "not working",
    "broken",
    "after hours",
    "today",
    "urgent",
  ],
  scheduled: ["service", "maintenance", "inspection"],
  quote: ["quote", "install", "installation", "replace", "upgrade"],
};

export function getLeadUrgencyOption(value?: string | null) {
  return (
    LEAD_URGENCY_OPTIONS.find((option) => option.value === value) ||
    LEAD_URGENCY_OPTIONS.find((option) => option.value === "scheduled") ||
    LEAD_URGENCY_OPTIONS[2]
  );
}

export function getLeadUrgencyLabel(value?: string | null) {
  return getLeadUrgencyOption(value).label;
}

export function getLeadUrgencyBadgeClassName(value?: string | null) {
  switch (value) {
    case "emergency":
      return "border-transparent bg-rose-500/15 text-rose-700 dark:text-rose-200";
    case "same_day":
      return "border-transparent bg-amber-500/15 text-amber-800 dark:text-amber-200";
    case "quote":
      return "border-transparent bg-sky-500/15 text-sky-700 dark:text-sky-200";
    case "scheduled":
    default:
      return "border-transparent bg-muted text-muted-foreground";
  }
}

export function getLeadUrgencySlaMinutes(
  value?: string | null,
  slaMinutes?: LeadResponseSlaMinutes | null,
) {
  const urgency = getLeadUrgencyOption(value).value;
  const configured = slaMinutes?.[urgency];

  if (typeof configured === "number" && Number.isFinite(configured) && configured > 0) {
    return Math.round(configured);
  }

  return DEFAULT_LEAD_RESPONSE_SLA_MINUTES[urgency];
}

export function getLeadUrgencySortRank(value?: string | null) {
  switch (value) {
    case "emergency":
      return 0;
    case "same_day":
      return 1;
    case "scheduled":
      return 2;
    case "quote":
      return 3;
    default:
      return 4;
  }
}

export function inferLeadUrgency(...values: Array<string | null | undefined>): LeadUrgency {
  const haystack = values
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  for (const urgency of ["emergency", "same_day", "quote", "scheduled"] as const) {
    if (urgencyKeywords[urgency].some((keyword) => haystack.includes(keyword))) {
      return urgency;
    }
  }

  return "scheduled";
}

export function buildLeadResponseDueAt(
  createdAt = new Date(),
  urgency?: string | null,
  slaMinutes?: LeadResponseSlaMinutes | null,
) {
  const dueAt = new Date(createdAt);
  dueAt.setMinutes(dueAt.getMinutes() + getLeadUrgencySlaMinutes(urgency, slaMinutes));
  return dueAt.toISOString();
}

export function isLeadResponseOverdue(
  responseDueAt?: string | null,
  status?: string | null,
) {
  if (!responseDueAt || ["contacted", "booked", "won", "lost", "stale"].includes(status || "")) {
    return false;
  }

  return new Date(responseDueAt).getTime() < Date.now();
}

export function isLeadResponseClosed(status?: string | null) {
  return ["contacted", "booked", "won", "lost", "stale"].includes(status || "");
}

export type LeadResponseSlaState =
  | "pending"
  | "overdue"
  | "hit"
  | "missed"
  | "closed_unanswered"
  | "untracked";

export function getLeadResponseSlaState({
  firstRespondedAt,
  lastContactedAt,
  responseDueAt,
  status,
}: {
  firstRespondedAt?: string | null;
  lastContactedAt?: string | null;
  responseDueAt?: string | null;
  status?: string | null;
}): LeadResponseSlaState {
  if (!responseDueAt) {
    return "untracked";
  }

  const dueAt = new Date(responseDueAt).getTime();
  if (Number.isNaN(dueAt)) {
    return "untracked";
  }

  const responseAt = firstRespondedAt || lastContactedAt || null;

  if (responseAt) {
    const contactedAt = new Date(responseAt).getTime();

    if (Number.isNaN(contactedAt)) {
      return "untracked";
    }

    return contactedAt <= dueAt ? "hit" : "missed";
  }

  if (["lost", "stale"].includes(status || "")) {
    return "closed_unanswered";
  }

  return dueAt < Date.now() ? "overdue" : "pending";
}

export function getLeadResponseSlaLabel(state: LeadResponseSlaState) {
  switch (state) {
    case "hit":
      return "SLA hit";
    case "missed":
      return "SLA missed";
    case "overdue":
      return "SLA overdue";
    case "pending":
      return "SLA pending";
    case "closed_unanswered":
      return "Closed unanswered";
    case "untracked":
    default:
      return "SLA untracked";
  }
}

export function getLeadResponseSlaClassName(state: LeadResponseSlaState) {
  switch (state) {
    case "hit":
      return "border-transparent bg-emerald-500/15 text-emerald-800 dark:text-emerald-200";
    case "missed":
    case "overdue":
      return "border-transparent bg-rose-500/15 text-rose-700 dark:text-rose-200";
    case "pending":
      return "border-transparent bg-sky-500/15 text-sky-700 dark:text-sky-200";
    case "closed_unanswered":
      return "border-transparent bg-amber-500/15 text-amber-800 dark:text-amber-200";
    case "untracked":
    default:
      return "border-transparent bg-muted text-muted-foreground";
  }
}

export function compareLeadResponsePriority<
  T extends {
    created_at?: string | null;
    lead_urgency?: string | null;
    response_due_at?: string | null;
    status?: string | null;
  },
>(left: T, right: T) {
  const leftClosed = isLeadResponseClosed(left.status);
  const rightClosed = isLeadResponseClosed(right.status);

  if (leftClosed !== rightClosed) {
    return leftClosed ? 1 : -1;
  }

  const urgencyDelta =
    getLeadUrgencySortRank(left.lead_urgency) -
    getLeadUrgencySortRank(right.lead_urgency);

  if (urgencyDelta !== 0) {
    return urgencyDelta;
  }

  const leftDue = left.response_due_at
    ? new Date(left.response_due_at).getTime()
    : Number.MAX_SAFE_INTEGER;
  const rightDue = right.response_due_at
    ? new Date(right.response_due_at).getTime()
    : Number.MAX_SAFE_INTEGER;

  if (leftDue !== rightDue) {
    return leftDue - rightDue;
  }

  const leftCreated = left.created_at ? new Date(left.created_at).getTime() : 0;
  const rightCreated = right.created_at ? new Date(right.created_at).getTime() : 0;

  return rightCreated - leftCreated;
}

export function formatLeadResponseDueAt(value?: string | null) {
  if (!value) {
    return "No response SLA set";
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

export function mapLeadUrgencyToDispatchPriority(value?: string | null) {
  switch (value) {
    case "emergency":
      return "emergency";
    case "same_day":
      return "same_day";
    case "quote":
      return "backlog";
    case "scheduled":
    default:
      return "scheduled";
  }
}
