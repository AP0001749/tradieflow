type LeadAuditSnapshotInput = {
  notes?: string | null;
  meta?: unknown;
  suburb?: string | null;
  jobType?: string | null;
};

export type LeadAuditSnapshot = {
  businessName: string | null;
  abn: string | null;
  teamSize: string | null;
  afterHoursCoverage: string | null;
  dispatchRadius: string | null;
  serviceArea: string | null;
  serviceType: string | null;
  leadUrgency: string | null;
  responseDueAt: string | null;
  triageProblem: string | null;
  triageSiteRisk: string | null;
  triageSafetyRisk: boolean;
};

function asRecord(value: unknown) {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function parseLeadNotes(notes?: string | null) {
  const snapshot: Partial<LeadAuditSnapshot> = {};

  for (const part of (notes || "").split("|")) {
    const [rawKey, ...rawValueParts] = part.split(":");
    const key = rawKey?.trim().toLowerCase();
    const value = rawValueParts.join(":").trim();

    if (!key || !value) {
      continue;
    }

    switch (key) {
      case "business":
        snapshot.businessName = value;
        break;
      case "abn":
        snapshot.abn = value;
        break;
      case "team size":
        snapshot.teamSize = value;
        break;
      case "after-hours coverage":
        snapshot.afterHoursCoverage = value;
        break;
      case "dispatch radius":
        snapshot.dispatchRadius = value;
        break;
      case "urgency":
        snapshot.leadUrgency = value;
        break;
      case "problem":
        snapshot.triageProblem = value;
        break;
      case "risk":
        snapshot.triageSiteRisk = value;
        break;
      default:
        break;
    }
  }

  return snapshot;
}

export function parseLeadAuditSnapshot({
  notes,
  meta,
  suburb,
  jobType,
}: LeadAuditSnapshotInput): LeadAuditSnapshot {
  const parsedNotes = parseLeadNotes(notes);
  const metaRecord = asRecord(meta);

  return {
    businessName: readString(metaRecord.business_name) || parsedNotes.businessName || null,
    abn: readString(metaRecord.abn) || parsedNotes.abn || null,
    teamSize: readString(metaRecord.team_size) || parsedNotes.teamSize || null,
    afterHoursCoverage:
      readString(metaRecord.after_hours_coverage) || parsedNotes.afterHoursCoverage || null,
    dispatchRadius:
      readString(metaRecord.dispatch_radius) || parsedNotes.dispatchRadius || null,
    serviceArea: readString(metaRecord.service_area) || readString(suburb) || null,
    serviceType: readString(metaRecord.service_type) || readString(jobType) || null,
    leadUrgency:
      readString(metaRecord.lead_urgency) || parsedNotes.leadUrgency || null,
    responseDueAt: readString(metaRecord.response_due_at) || null,
    triageProblem:
      readString(metaRecord.triage_problem) || parsedNotes.triageProblem || null,
    triageSiteRisk:
      readString(metaRecord.triage_site_risk) || parsedNotes.triageSiteRisk || null,
    triageSafetyRisk: metaRecord.triage_safety_risk === true,
  };
}

export function hasLeadAuditSnapshot(snapshot: LeadAuditSnapshot) {
  return Boolean(
    snapshot.businessName ||
      snapshot.abn ||
      snapshot.teamSize ||
      snapshot.afterHoursCoverage ||
      snapshot.dispatchRadius ||
      snapshot.serviceArea ||
      snapshot.serviceType ||
      snapshot.leadUrgency ||
      snapshot.responseDueAt ||
      snapshot.triageProblem ||
      snapshot.triageSiteRisk ||
      snapshot.triageSafetyRisk
  );
}
