export const DEFAULT_MISSED_CALL_TEXT_TEMPLATE =
  "Hi, this is {{business_name}}. I'm currently under a house or on the tools. What's your emergency? I'll text you right back.";

export const DEFAULT_QUOTE_FOLLOWUP_TEMPLATE =
  "Hey {{contact_name}}, just checking if you had any questions about the quote from {{business_name}}. Happy to run you through the job before you make a call — just reply here.";

export const DEFAULT_REVIEW_REQUEST_TEMPLATE =
  "Hi {{contact_name}}, thanks for choosing {{business_name}}. If the job went well, would you mind leaving a quick Google review? It really helps. {{google_review_url}}";

export function coerceAutomationTemplate(value: string | null | undefined, fallback: string) {
  const normalizedValue = value?.trim();
  return normalizedValue ? normalizedValue : fallback;
}

export function getAutomationDueAt(
  timestamp: string | null | undefined,
  delayHours: number
) {
  if (!timestamp) {
    return null;
  }

  const sourceDate = new Date(timestamp);

  if (Number.isNaN(sourceDate.getTime())) {
    return null;
  }

  const safeDelayHours = Number.isFinite(delayHours) ? delayHours : 0;
  return new Date(sourceDate.getTime() + safeDelayHours * 60 * 60 * 1000);
}

export function isAutomationDue(dueAt: Date | null, now = new Date()) {
  return Boolean(dueAt && dueAt.getTime() <= now.getTime());
}

export function formatAutomationTimestamp(value: string | Date | null | undefined) {
  if (!value) {
    return "Not logged";
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not logged";
  }

  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
