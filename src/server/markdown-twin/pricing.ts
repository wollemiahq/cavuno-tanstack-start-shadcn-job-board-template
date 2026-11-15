/**
 * The pricing page's Markdown twin (`/pricing.md`).
 *
 * Calls the server function the pricing route loader calls, so board
 * access and the password wall are unchanged, and lists the same plan
 * groups, prices, feature lines and actions the page's cards show.
 */
import { isNotFound as isBoardNotFound } from '@cavuno/board';
import { isNotFound } from '@tanstack/react-router';

import { configuredMembershipCapacitySentence } from '../../board/plan-benefits';
import { planDescription, planName } from '../../board/plan-labels';
import {
  planCardFeatures,
  planGroups,
  planPriceText,
} from '../../board/plan-offer';
import { selfUrl } from '../../lib/self-url';
import { m } from '../../paraglide/messages';
import { getPricingPage } from '../marketing-pages';
import {
  bulletList,
  escapeInline,
  link,
  markdownDocument,
  section,
} from './format';
import { canonicalOf } from './job-listing';

import type { MarkdownTwin } from '../../lib/markdown-twin/routes';
import type { MarkdownTwinResult } from './result';
import type { Plan } from '@cavuno/board';

export type PricingTwinDependencies = {
  getPricingPage: () => Promise<{
    plans: Plan[];
    contactPlans: Plan[];
    seo: { origin: string };
    head: { links: ReadonlyArray<{ rel: string; href: string }> };
  }>;
};

const defaultDependencies: PricingTwinDependencies = { getPricingPage };

/** The card's action as a link, as the page's card renders it. */
function planAction(plan: Plan, origin: string): string | null {
  if (plan.pricingMode === 'contact') {
    if (!plan.ctaDestination) return null;
    return link(
      plan.ctaText?.trim() || m.memberships_contactCtaFallback(),
      new URL(plan.ctaDestination, origin).href,
    );
  }
  const label = plan.invoiceOnly
    ? m.employerLanding_requestInvoiceLabel()
    : plan.purpose === 'job_posting'
      ? m.siteHeader_postJobLabel()
      : m.employerLanding_subscribeLabel();
  switch (plan.purpose) {
    case 'job_seeker':
      return link(
        m.employerLanding_subscribeLabel(),
        selfUrl(origin, '/account/access'),
      );
    case 'membership':
      return link(m.memberships_joinLabel(), selfUrl(origin, '/memberships'));
    case 'job_posting':
      return link(
        label,
        `${selfUrl(origin, '/post')}?plan=${encodeURIComponent(plan.id)}`,
      );
    case 'talent_access':
      return link(label, selfUrl(origin, '/employers'));
    default:
      return link(
        label,
        `${selfUrl(origin, '/auth/join')}?returnTo=${encodeURIComponent('/employers')}`,
      );
  }
}

function planBlock(plan: Plan, origin: string): string {
  const description = planDescription(plan)
    ?.split(/\r?\n/)
    .map((line) => escapeInline(line))
    .filter(Boolean)
    .join('  \n');
  const name = escapeInline(planName(plan));
  return markdownDocument([
    plan.isRecommended
      ? `### ${name} (${escapeInline(m.employerLanding_recommendedBadge())})`
      : `### ${name}`,
    description,
    `**${escapeInline(planPriceText(plan))}**`,
    bulletList(
      [
        ...planCardFeatures(plan),
        plan.purpose === 'membership'
          ? configuredMembershipCapacitySentence(plan)
          : null,
      ].map((line) => (line ? escapeInline(line) : null)),
    ),
    planAction(plan, origin),
  ]).trimEnd();
}

export async function buildPricingTwin(
  twin: MarkdownTwin,
  origin: string,
  dependencies: PricingTwinDependencies = defaultDependencies,
): Promise<MarkdownTwinResult> {
  let page;
  try {
    page = await dependencies.getPricingPage();
  } catch (error) {
    if (isNotFound(error) || isBoardNotFound(error))
      return { type: 'notFound' };
    throw error;
  }
  const groups = planGroups({
    plans: page.plans,
    contactPlans: page.contactPlans,
    audience: 'all',
  });
  const body = markdownDocument([
    `# ${escapeInline(m.pricing_title())}`,
    escapeInline(m.pricing_description()),
    ...(groups.length > 0
      ? groups.map((group) =>
          section(
            group.title,
            group.plans.map((plan) => planBlock(plan, origin)).join('\n\n'),
          ),
        )
      : [escapeInline(m.employerLanding_noPlansText())]),
  ]);
  return { type: 'markdown', body, canonical: canonicalOf(page, twin) };
}
