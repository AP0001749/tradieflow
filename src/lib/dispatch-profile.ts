type DispatchProfileInput = {
  team_size?: string | null;
  after_hours_coverage?: string | null;
  dispatch_radius?: string | null;
};

export const DISPATCH_TEAM_SIZE_OPTIONS = [
  "Solo operator",
  "2-5 techs",
  "6-10 techs",
  "10+ techs",
] as const;

export const AFTER_HOURS_COVERAGE_OPTIONS = [
  "24/7 callout",
  "After-hours roster",
  "Business hours only",
] as const;

export const DISPATCH_RADIUS_OPTIONS = [
  "Under 10 km",
  "10-25 km",
  "25-50 km",
  "50 km+",
] as const;

function hasValue(value?: string | null) {
  return Boolean(value?.trim());
}

export function countDispatchProfileFields(profile: DispatchProfileInput) {
  return [
    profile.team_size,
    profile.after_hours_coverage,
    profile.dispatch_radius,
  ].filter((value) => hasValue(value)).length;
}

export function hasDispatchProfile(profile: DispatchProfileInput) {
  return countDispatchProfileFields(profile) === 3;
}

export function getDispatchProfileValue(value?: string | null, fallback = "Not set") {
  return hasValue(value) ? value!.trim() : fallback;
}
