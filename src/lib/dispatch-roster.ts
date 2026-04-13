export function normalizeDispatchRoster(
  value: string | string[] | null | undefined,
) {
  const source = Array.isArray(value) ? value.join("\n") : value || "";
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const entry of source.split(/[\n,]+/)) {
    const cleaned = entry.replace(/\s+/g, " ").trim();
    if (!cleaned) {
      continue;
    }

    const dedupeKey = cleaned.toLowerCase();
    if (seen.has(dedupeKey)) {
      continue;
    }

    seen.add(dedupeKey);
    normalized.push(cleaned.slice(0, 80));
  }

  return normalized.slice(0, 24);
}

export function formatDispatchRosterText(value?: string[] | null) {
  return (value || []).join("\n");
}

export function getDispatchRosterPreview(
  value?: string[] | null,
  maxItems = 4,
) {
  return (value || []).slice(0, maxItems);
}
