export function hasDispatchGeoPoint(
  latitude?: number | null,
  longitude?: number | null,
) {
  return typeof latitude === "number" && typeof longitude === "number";
}

export function formatDispatchGeoPoint(
  latitude?: number | null,
  longitude?: number | null,
) {
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return null;
  }

  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}

export function buildDispatchGeoMapUrl(
  latitude?: number | null,
  longitude?: number | null,
) {
  const point = formatDispatchGeoPoint(latitude, longitude);

  if (!point) {
    return null;
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(point)}`;
}

export function formatDispatchGeoAccuracy(value?: number | null) {
  if (typeof value !== "number") {
    return null;
  }

  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)} km`;
  }

  return `${Math.round(value)} m`;
}

export function formatDispatchGeoTimestamp(value?: string | null) {
  if (!value) {
    return "No GPS point captured yet";
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
