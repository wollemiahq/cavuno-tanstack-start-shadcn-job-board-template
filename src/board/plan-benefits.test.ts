import { describe, expect, it } from 'vitest';

import { membershipCapacitySentence, planBenefitLines } from './plan-benefits';

import type { Plan } from '@cavuno/board';

/**
 * The `name` the platform actually seeds for each capability key
 * (`convex/billing/plansMutations.ts` `DEFAULT_FEATURES`). These are
 * operator-facing dashboard labels, and they are what `genericFeatureLines`
 * renders verbatim for any key the copy layer does not claim.
 *
 * Using them rather than the key itself is what stops these fixtures being
 * tautological: if a key here stops matching the one the code reads, the
 * expected array below has to be rewritten to the raw dashboard label, so the
 * bug shows up in the diff instead of the suite staying green.
 */
const SEEDED_FEATURE_NAMES = new Map([
  ['jobs.max_active', 'Max Active Jobs'],
  ['jobs.included_posts', 'Included job posts'],
  ['jobs.duration_days', 'Job Duration (Days)'],
  ['jobs.featured_slots', 'Featured Slots'],
  ['jobs.included_featured', 'Included featured jobs'],
  ['jobs.feature_selection_mode', 'Feature Selection Mode'],
  ['jobs.posting_discount_percent', 'Posting discount (%)'],
  ['talent.profile_unlocks', 'Profile unlocks per period'],
  ['talent.messages_sent', 'Messages per period'],
]);

function plan(values: Record<string, string>): Pick<Plan, 'features'> {
  return {
    features: Object.fromEntries(
      Object.entries(values).map(([key, value]) => [
        key,
        {
          value,
          name: SEEDED_FEATURE_NAMES.get(key) ?? key,
          dataType: 'string',
        },
      ]),
    ),
  };
}

describe('membership capacity sentence', () => {
  it('reads a credit allowance and its featured share as one sentence', () => {
    expect(
      membershipCapacitySentence(
        plan({ 'jobs.included_posts': '3', 'jobs.included_featured': '1' }),
      ),
    ).toBe('3 one-time posts. 1 of them can be featured.');
  });

  it('reads a slot cap as concurrent, with concurrent featured slots', () => {
    expect(
      membershipCapacitySentence(
        plan({
          'jobs.included_posts': 'unlimited',
          'jobs.max_active': '10',
          'jobs.included_featured': 'unlimited',
          'jobs.featured_slots': '2',
        }),
      ),
    ).toBe('10 jobs live at once. 2 of them can be featured at a time.');
  });

  it('says every post can be featured only when posting itself is unlimited', () => {
    expect(
      membershipCapacitySentence(
        plan({
          'jobs.included_posts': 'unlimited',
          'jobs.max_active': 'unlimited',
          'jobs.included_featured': 'unlimited',
          'jobs.featured_slots': 'unlimited',
        }),
      ),
    ).toBe('Unlimited posts. Every post can be featured.');
  });

  it('says none of them can be featured when the plan features nothing', () => {
    expect(
      membershipCapacitySentence(plan({ 'jobs.included_posts': '1' })),
    ).toBe('1 one-time post. None of them can be featured.');
  });

  it('stands alone as "No featured jobs" when there is no posting capacity', () => {
    expect(membershipCapacitySentence(plan({}))).toBe('No featured jobs');
  });
});

describe('plan benefit lines', () => {
  it('renders the member discount and talent allowances', () => {
    expect(
      planBenefitLines(
        plan({
          'jobs.posting_discount_percent': '20',
          'talent.profile_unlocks': '5',
          'talent.messages_sent': 'unlimited',
        }),
      ),
    ).toEqual([
      '20% off further job posts',
      '5 profile unlocks',
      'Unlimited messages',
    ]);
  });

  it('names the listing duration instead of echoing its dashboard label', () => {
    // Every membership plan carries `jobs.duration_days` (seeded default 30),
    // so without a named line every /memberships page read
    // "30 Job Duration (Days)". The job-posting path has always named it.
    expect(planBenefitLines(plan({ 'jobs.duration_days': '60' }))).toEqual([
      'Live for 60 days',
    ]);
  });

  it('renders no line for the featured-selection mechanism', () => {
    // `auto` is not a number, so the generic line read "auto Feature Selection
    // Mode". It decides how featured jobs are picked; it is not a benefit.
    expect(
      planBenefitLines(plan({ 'jobs.feature_selection_mode': 'auto' })),
    ).toEqual([]);
  });

  it('renders nothing for a membership that only carries posting capacity', () => {
    expect(planBenefitLines(plan({ 'jobs.included_posts': '2' }))).toEqual([]);
  });

  it('renders an operator-defined feature the starter has never heard of', () => {
    // The features map is self-describing: a benefit the starter does not know
    // must still render, in the operator's display order, from its own name.
    expect(
      planBenefitLines({
        features: {
          'events.tickets': {
            value: '2',
            name: 'conference tickets',
            dataType: 'number',
            displayOrder: 2,
          },
          'directory.spotlight': {
            value: 'true',
            name: 'Directory spotlight',
            dataType: 'boolean',
            displayOrder: 1,
          },
          'support.hours': {
            value: 'unlimited',
            name: 'support hours',
            dataType: 'number',
            displayOrder: 3,
          },
          'events.badges': {
            value: '0',
            name: 'event badges',
            dataType: 'number',
            displayOrder: 4,
          },
        },
      }),
    ).toEqual([
      'Directory spotlight',
      '2 conference tickets',
      'Unlimited support hours',
    ]);
  });
});
