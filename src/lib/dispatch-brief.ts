type DispatchBriefInput = {
  title: string;
  clientName?: string | null;
  clientPhone?: string | null;
  clientEmail?: string | null;
  siteAddress?: string | null;
  dispatchSequence?: number | null;
  dispatchCheckInStatus?: string | null;
  dispatchLastKnownLocation?: string | null;
  dispatchEtaNote?: string | null;
  dispatchLastCheckedInAt?: string | null;
  dispatchGeoLatitude?: number | null;
  dispatchGeoLongitude?: number | null;
  dispatchGeoAccuracyMeters?: number | null;
  dispatchGeoCapturedAt?: string | null;
  dispatchPriority?: string | null;
  serviceWindow?: string | null;
  assignedTechnician?: string | null;
  tradeVertical?: string | null;
  scheduledDate?: string | null;
  description?: string | null;
  siteAccessNotes?: string | null;
};

function formatLabelValue(label: string, value?: string | null) {
  if (!value?.trim()) {
    return null;
  }

  return `${label}: ${value.trim()}`;
}

function formatScheduledDate(value?: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("en-AU");
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString("en-AU");
}

export function formatDispatchBrief({
  title,
  clientName,
  clientPhone,
  clientEmail,
  siteAddress,
  dispatchSequence,
  dispatchCheckInStatus,
  dispatchLastKnownLocation,
  dispatchEtaNote,
  dispatchLastCheckedInAt,
  dispatchGeoLatitude,
  dispatchGeoLongitude,
  dispatchGeoAccuracyMeters,
  dispatchGeoCapturedAt,
  dispatchPriority,
  serviceWindow,
  assignedTechnician,
  tradeVertical,
  scheduledDate,
  description,
  siteAccessNotes,
}: DispatchBriefInput) {
  const geoPoint =
    typeof dispatchGeoLatitude === "number" &&
    typeof dispatchGeoLongitude === "number"
      ? `${dispatchGeoLatitude.toFixed(5)}, ${dispatchGeoLongitude.toFixed(5)}`
      : null;
  const geoAccuracy =
    typeof dispatchGeoAccuracyMeters === "number"
      ? `within ${Math.round(dispatchGeoAccuracyMeters)}m`
      : null;

  return [
    `Dispatch Brief: ${title}`,
    formatLabelValue("Client", clientName),
    formatLabelValue("Phone", clientPhone),
    formatLabelValue("Email", clientEmail),
    formatLabelValue("Site", siteAddress),
    dispatchSequence ? `Run Order: #${dispatchSequence}` : null,
    formatLabelValue(
      "Check-In",
      dispatchCheckInStatus?.replaceAll("_", " "),
    ),
    formatLabelValue("Location", dispatchLastKnownLocation),
    formatLabelValue("ETA", dispatchEtaNote),
    formatLabelValue("Last Update", formatDateTime(dispatchLastCheckedInAt)),
    formatLabelValue(
      "GPS",
      [geoPoint, geoAccuracy].filter(Boolean).join(" "),
    ),
    formatLabelValue("GPS Captured", formatDateTime(dispatchGeoCapturedAt)),
    formatLabelValue(
      "Schedule",
      [formatScheduledDate(scheduledDate), serviceWindow]
        .filter(Boolean)
        .join(" - ")
        .replaceAll("_", " "),
    ),
    formatLabelValue("Priority", dispatchPriority?.replaceAll("_", " ")),
    formatLabelValue("Crew", assignedTechnician),
    formatLabelValue("Trade", tradeVertical?.replaceAll("_", " ")),
    formatLabelValue("Job Notes", description),
    formatLabelValue("Site Access", siteAccessNotes),
  ]
    .filter(Boolean)
    .join("\n");
}
