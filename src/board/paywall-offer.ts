import { m } from '../paraglide/messages';
import {
  candidatePlanBenefits,
  candidatePlanEntitlements,
  type CandidatePlanEntitlements,
} from './candidate-plan-benefits';

import type { PaywallOffer, Plan } from '@cavuno/board';

export type CandidatePaywallFeature = 'matches' | 'job_alerts';

export type CandidatePaywallOffer = PaywallOffer & {
  entitlements?: CandidatePlanEntitlements;
  description?: string | null;
  benefits?: string[];
};

/** Descriptive metadata belongs to an offer only when the plan ID matches. */
export function candidatePaywallOffers(
  offers: (PaywallOffer & { entitlements?: CandidatePlanEntitlements })[],
  plans: Pick<Plan, 'id' | 'description' | 'features'>[],
): CandidatePaywallOffer[] {
  return offers.map((offer) => {
    const plan = plans.find((candidate) => candidate.id === offer.offerKey);
    return {
      ...offer,
      entitlements:
        offer.entitlements ??
        (plan ? candidatePlanEntitlements(plan) : undefined),
      description: plan?.description ?? null,
      benefits: plan ? candidatePlanBenefits(plan) : [],
    };
  });
}

/** A feature gate only sells offers known to unlock that feature. */
export function candidateOffersForFeature(
  offers: CandidatePaywallOffer[],
  feature: CandidatePaywallFeature,
): CandidatePaywallOffer[] {
  return offers.filter((offer) => offer.entitlements?.[feature] === true);
}

/** Structured cadence is localized; unknown shapes retain the wire label. */
export function offerBillingLabel(offer: PaywallOffer): string {
  if (offer.offerType === 'lifetime') return m.accessOffer_oneTime();
  const count = offer.intervalCount ?? 1;
  if (offer.intervalUnit === 'month') {
    return count === 1
      ? m.accessOffer_perMonth()
      : m.accessOffer_everyMonths({ count, countLabel: String(count) });
  }
  if (offer.intervalUnit === 'year') {
    return count === 1
      ? m.accessOffer_perYear()
      : m.accessOffer_everyYears({ count, countLabel: String(count) });
  }
  if (offer.intervalUnit === 'week' && count === 1) {
    return m.accessOffer_perWeek();
  }
  if (offer.intervalUnit === 'day' && count === 1) {
    return m.accessOffer_perDay();
  }
  return offer.billingLabel;
}
