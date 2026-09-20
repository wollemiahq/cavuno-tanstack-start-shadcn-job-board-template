import type { Plan } from '@cavuno/board';

export function hasPaidCandidatePlans(
  plans: readonly Pick<Plan, 'purpose' | 'kind'>[],
): boolean {
  return plans.some(
    (plan) => plan.purpose === 'job_seeker' && plan.kind !== 'free',
  );
}
