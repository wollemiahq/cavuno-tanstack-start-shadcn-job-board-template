import { notFound } from '@tanstack/react-router';
import { describe, expect, it, vi } from 'vitest';

import { planDescription, planName } from '../../board/plan-labels';
import { planCardFeatures, planPriceText } from '../../board/plan-offer';
import { localizePath } from '../../lib/localized-path';
import { resolveMarkdownTwin } from '../../lib/markdown-twin/routes';
import { selfUrl } from '../../lib/self-url';
import { m } from '../../paraglide/messages';
import { escapeInline } from './format';
import { buildPricingTwin, type PricingTwinDependencies } from './pricing';

import type { Plan } from '@cavuno/board';

const ORIGIN = 'https://board.example';
const CANONICAL = `${ORIGIN}/pricing`;

const postingPlan = {
  object: 'plan',
  id: 'plan-growth',
  name: 'Growth *plan*',
  description: null,
  purpose: 'job_posting',
  kind: 'subscription',
  billingInterval: 'month',
  isRecommended: true,
  displayOrder: 1,
  invoiceOnly: false,
  publishTiming: 'on_payment',
  netTermsDays: null,
  billingIntervalCount: null,
  pricingMode: 'priced',
  priceText: null,
  ctaText: null,
  ctaDestination: null,
  price: { currency: 'usd', amountCents: 9900, stripePriceId: 'price_growth' },
  featureSummary: {
    durationDays: 30,
    maxActiveJobs: 5,
    featuredSlots: 1,
    featureSelectionMode: 'manual',
  },
  features: {},
} satisfies Plan;

const contactPlan = {
  ...postingPlan,
  id: 'plan-enterprise',
  name: 'Enterprise',
  purpose: 'employer_service',
  isRecommended: false,
  pricingMode: 'contact',
  priceText: 'From $5k',
  ctaText: 'Talk to us',
  ctaDestination: 'https://example.com/sales',
} satisfies Plan;

function twin() {
  const resolved = resolveMarkdownTwin({
    method: 'GET',
    url: `${ORIGIN}${localizePath('/pricing')}.md`,
  });
  if (!resolved) throw new Error('no pricing twin');
  return resolved;
}

function dependencies(
  page: Partial<{ plans: Plan[]; contactPlans: Plan[] }> = {},
): PricingTwinDependencies {
  return {
    getPricingPage: vi.fn(async () => ({
      plans: [postingPlan],
      contactPlans: [contactPlan],
      seo: { origin: ORIGIN },
      head: { links: [{ rel: 'canonical', href: CANONICAL }] },
      ...page,
    })),
  };
}

async function body(deps: PricingTwinDependencies) {
  const result = await buildPricingTwin(twin(), ORIGIN, deps);
  if (result.type !== 'markdown') throw new Error(result.type);
  expect(result.canonical).toBe(CANONICAL);
  return result.body;
}

describe('pricing twin', () => {
  it('lists each plan group with prices, features and actions', async () => {
    const markdown = await body(dependencies());

    expect(markdown).toContain(`# ${escapeInline(m.pricing_title())}\n`);
    expect(markdown).toContain(
      `## ${escapeInline(m.employerLanding_jobPostingHeading())}\n\n` +
        `### ${escapeInline(planName(postingPlan))} (${escapeInline(m.employerLanding_recommendedBadge())})\n\n` +
        `${escapeInline(planDescription(postingPlan) ?? '')}\n\n` +
        `**${escapeInline(planPriceText(postingPlan))}**\n\n` +
        planCardFeatures(postingPlan)
          .map((line) => `- ${escapeInline(line)}`)
          .join('\n'),
    );
    expect(markdown).toContain(
      `[${escapeInline(m.siteHeader_postJobLabel())}](${selfUrl(ORIGIN, '/post')}?plan=plan-growth)`,
    );
    expect(markdown).toContain(
      `## ${escapeInline(m.employerLanding_enterpriseHeading())}`,
    );
    expect(markdown).toContain('**From $5k**');
    expect(markdown).toContain('[Talk to us](https://example.com/sales)');
  });

  it('says so when the board sells no plans', async () => {
    const markdown = await body(dependencies({ plans: [], contactPlans: [] }));
    expect(markdown).toContain(escapeInline(m.employerLanding_noPlansText()));
    expect(markdown).not.toContain('## ');
  });

  it('404s when the page 404s', async () => {
    const deps: PricingTwinDependencies = {
      getPricingPage: vi.fn(async () => {
        throw notFound();
      }),
    };
    await expect(buildPricingTwin(twin(), ORIGIN, deps)).resolves.toEqual({
      type: 'notFound',
    });
  });
});
