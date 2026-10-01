import type { Plan } from '@cavuno/board';

export type CandidatePlanEntitlements = {
  listings: boolean;
  matches: boolean;
  job_alerts: boolean;
};

const candidateFeatureKeys = [
  'job_seeker.listings',
  'job_seeker.matches',
  'job_seeker.job_alerts',
] as const;

function included(value: string | null | undefined): boolean {
  const normalized = value?.trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
}

/** Compatibility for APIs that predate resolved offer permissions. */
export function candidatePlanEntitlements(
  plan: Pick<Plan, 'features'>,
): CandidatePlanEntitlements {
  const values = candidateFeatureKeys.map((key) => plan.features?.[key]?.value);
  // Older plans without configured candidate flags grant all candidate features.
  if (!values.some((value) => value != null && value !== '')) {
    return { listings: true, matches: true, job_alerts: true };
  }
  return {
    listings: included(values[0]),
    matches: included(values[1]),
    job_alerts: included(values[2]),
  };
}

/** Only configured candidate entitlements, never employer listing defaults. */
export function candidatePlanBenefits(plan: Pick<Plan, 'features'>): string[] {
  return candidateFeatureKeys.flatMap((key) => {
    const feature = plan.features?.[key];
    return included(feature?.value) && feature?.name ? [feature.name] : [];
  });
}
