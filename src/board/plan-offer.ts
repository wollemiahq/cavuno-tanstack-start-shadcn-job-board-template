/**
 * What a plan card on the plan pages (`/employers`, `/job-seekers`,
 * `/pricing`) says: the price and the feature lines, and which groups the
 * cards fall into. Shared by the plan pages so they
 * never disagree.
 */
import { m } from '../paraglide/messages';
import { getLocale } from '../paraglide/runtime';
import { candidatePlanBenefits } from './candidate-plan-benefits';
import { customAttributeLines, planBenefitLines } from './plan-benefits';

import type { Plan } from '@cavuno/board';

export type PlanAudience = 'employers' | 'candidates' | 'all';

export function formatPlanPrice(price: Plan['price']): string {
  if (!price) return m.employerLanding_freeLabel();
  // Chrome-locale figure inside chrome-locale sentences (same rule as the
  // salary FAQ): the price agrees with the copy around it.
  return new Intl.NumberFormat(getLocale(), {
    style: 'currency',
    currency: price.currency.toUpperCase(),
    minimumFractionDigits: price.amountCents % 100 === 0 ? 0 : 2,
  }).format(price.amountCents / 100);
}

export const planIntervalSuffix = (interval: Plan['billingInterval']) =>
  interval === 'month'
    ? m.employerLanding_perMonthSuffix()
    : interval === 'year'
      ? m.employerLanding_perYearSuffix()
      : '';

/**
 * The price as one line of text. `pricingMode` is the authority, never
 * `price`: a quote-only plan can still carry a zeroed price row, so reading
 * `price` would advertise "Free" for an enterprise tier.
 */
export function planPriceText(plan: Plan): string {
  if (plan.pricingMode === 'contact') {
    return plan.priceText?.trim() || m.memberships_contactPriceFallback();
  }
  if (plan.kind === 'free') return m.employerLanding_freeLabel();
  const price = formatPlanPrice(plan.price);
  return plan.price
    ? `${price}${planIntervalSuffix(plan.billingInterval)}`
    : price;
}

function pricedPlanFeatures(plan: Plan): string[] {
  if (plan.purpose === 'job_seeker') return candidatePlanBenefits(plan);
  if (plan.purpose === 'membership') return planBenefitLines(plan);
  const grantsListings =
    plan.purpose !== 'talent_access' && plan.featureSummary.maxActiveJobs > 0;
  return [
    grantsListings
      ? m.employerLanding_featureActiveJobs({
          count: plan.featureSummary.maxActiveJobs,
          countLabel: String(plan.featureSummary.maxActiveJobs),
        })
      : null,
    grantsListings && plan.featureSummary.durationDays > 0
      ? m.employerLanding_featureListingDuration({
          days: plan.featureSummary.durationDays,
        })
      : null,
    grantsListings &&
    plan.features?.['jobs.featured_slots']?.value === 'unlimited'
      ? m.employerCompany_featuredUnlimitedText()
      : grantsListings && plan.featureSummary.featuredSlots > 0
        ? m.employerLanding_featureFeaturedSlots({
            count: plan.featureSummary.featuredSlots,
            countLabel: String(plan.featureSummary.featuredSlots),
          })
        : null,
    plan.talent
      ? m.employerLanding_featureProfileUnlocks({
          count: plan.talent.unlocksPerPeriod,
          countLabel: String(plan.talent.unlocksPerPeriod),
        })
      : null,
    plan.talent
      ? m.employerLanding_featureMessages({
          count: plan.talent.messagesPerPeriod,
          countLabel: String(plan.talent.messagesPerPeriod),
        })
      : null,
    ...customAttributeLines(plan),
  ].filter((feature) => feature !== null);
}

/** The feature lines a plan card lists. */
export function planCardFeatures(plan: Plan): string[] {
  return plan.pricingMode === 'contact'
    ? planBenefitLines(plan)
    : pricedPlanFeatures(plan);
}

/**
 * The plan groups a plan page shows for its audience, in page order, each
 * with its heading. Groups without plans are left out.
 */
export function planGroups({
  plans,
  contactPlans,
  audience,
}: {
  plans: Plan[];
  contactPlans: Plan[];
  audience: PlanAudience;
}): { title: string; plans: Plan[] }[] {
  const byPurpose = (purpose: Plan['purpose']) =>
    plans.filter((plan) => plan.purpose === purpose);
  const groups =
    audience === 'employers'
      ? []
      : [
          {
            title: m.candidateLanding_plansHeading(),
            plans: byPurpose('job_seeker'),
          },
        ];
  if (audience !== 'candidates') {
    groups.push(
      {
        title: m.employerLanding_jobPostingHeading(),
        plans: byPurpose('job_posting'),
      },
      {
        title: m.employerLanding_talentAccessHeading(),
        plans: byPurpose('talent_access'),
      },
      { title: m.employerLanding_enterpriseHeading(), plans: contactPlans },
      { title: m.memberships_title(), plans: byPurpose('membership') },
    );
  }
  return groups.filter((group) => group.plans.length > 0);
}
