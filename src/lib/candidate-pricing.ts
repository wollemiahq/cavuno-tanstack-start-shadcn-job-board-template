import type { Plan } from '@cavuno/board';

export function hasPaidCandidatePlans(
  plans: readonly Pick<Plan, 'purpose' | 'kind'>[],
): boolean {
  return plans.some(
    (plan) => plan.purpose === 'job_seeker' && plan.kind !== 'free',
  );
}

/**
 * Whether `/employers` has something to sell: a plan for employers, or a
 * sales-led employer service. The footer links the page and the sitemap
 * lists it under this rule.
 */
export function hasEmployerOfferPage(
  plans: readonly Pick<Plan, 'purpose'>[],
  employerServicePlans: readonly unknown[],
): boolean {
  return (
    plans.some((plan) => plan.purpose !== 'job_seeker') ||
    employerServicePlans.length > 0
  );
}
