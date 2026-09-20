import type { Plan } from '@cavuno/board';

/** Only configured candidate entitlements, never employer listing defaults. */
export function candidatePlanBenefits(plan: Pick<Plan, 'features'>): string[] {
  return [
    'job_seeker.listings',
    'job_seeker.matches',
    'job_seeker.job_alerts',
  ].flatMap((key) => {
    const feature = plan.features?.[key];
    return feature?.value === 'true' && feature.name ? [feature.name] : [];
  });
}
