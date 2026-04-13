export const MAX_ROUTE_STOPS_PER_PACK = 8;

type DispatchRouteJobInput = {
  id: string;
  title: string;
  assigned_technician?: string | null;
  dispatch_sequence?: number | null;
  dispatch_priority?: string | null;
  clients: {
    name: string | null;
    address: string | null;
  } | null;
};

export type DispatchRouteStop = {
  id: string;
  href: string;
  title: string;
  clientName: string | null;
  address: string;
  assignedTechnician: string | null;
  dispatchSequence: number | null;
  dispatchPriority: string | null;
  mapUrl: string;
};

export type DispatchRoutePack = {
  id: string;
  label: string;
  mapUrl: string;
  stops: DispatchRouteStop[];
  copyText: string;
};

function normalizeRouteAddress(value?: string | null) {
  const normalized = value?.replace(/\s+/g, " ").trim();
  return normalized || null;
}

export function buildGoogleMapsSearchUrl(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export function buildGoogleMapsDirectionsUrl(addresses: string[]) {
  const normalized = addresses
    .map((value) => normalizeRouteAddress(value))
    .filter((value): value is string => Boolean(value));

  if (normalized.length === 0) {
    return null;
  }

  if (normalized.length === 1) {
    return buildGoogleMapsSearchUrl(normalized[0]);
  }

  const destination = normalized[normalized.length - 1];
  const waypoints = normalized.slice(0, -1);
  const params = new URLSearchParams({
    api: "1",
    destination,
    travelmode: "driving",
  });

  if (waypoints.length > 0) {
    params.set("waypoints", waypoints.join("|"));
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

function buildRouteCopyText(stops: DispatchRouteStop[]) {
  return stops
    .map((stop, index) =>
      [
        `${index + 1}. ${stop.title}${stop.clientName ? ` - ${stop.clientName}` : ""}`,
        stop.address,
      ].join("\n"),
    )
    .join("\n\n");
}

export function buildDispatchRoutePlannerData(
  jobs: DispatchRouteJobInput[],
  maxStopsPerPack = MAX_ROUTE_STOPS_PER_PACK,
) {
  const stops = jobs
    .map((job) => {
      const address = normalizeRouteAddress(job.clients?.address);

      if (!address) {
        return null;
      }

      return {
        id: job.id,
        href: `/dashboard/jobs/${job.id}`,
        title: job.title,
        clientName: job.clients?.name || null,
        address,
        assignedTechnician: job.assigned_technician || null,
        dispatchSequence: job.dispatch_sequence ?? null,
        dispatchPriority: job.dispatch_priority || null,
        mapUrl: buildGoogleMapsSearchUrl(address),
      } satisfies DispatchRouteStop;
    })
    .filter((value): value is DispatchRouteStop => Boolean(value));

  const routePacks: DispatchRoutePack[] = [];

  for (let index = 0; index < stops.length; index += maxStopsPerPack) {
    const packStops = stops.slice(index, index + maxStopsPerPack);
    const mapUrl = buildGoogleMapsDirectionsUrl(
      packStops.map((stop) => stop.address),
    );

    if (!mapUrl) {
      continue;
    }

    routePacks.push({
      id: `route-pack-${routePacks.length + 1}`,
      label:
        stops.length <= maxStopsPerPack
          ? "Open Route"
          : `Open Route ${routePacks.length + 1}`,
      mapUrl,
      stops: packStops,
      copyText: buildRouteCopyText(packStops),
    });
  }

  return {
    routeReadyCount: stops.length,
    missingAddressCount: Math.max(jobs.length - stops.length, 0),
    routePacks,
  };
}
