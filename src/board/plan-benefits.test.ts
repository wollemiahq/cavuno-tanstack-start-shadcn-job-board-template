import { describe, expect, it, vi } from 'vitest';

vi.mock('../paraglide/messages', () => ({
  m: {
    membershipCapacity_postsCredits: ({ count }: { count: number }) =>
      `credits:${count}`,
    membershipCapacity_postsSlots: ({ count }: { count: number }) =>
      `slots:${count}`,
    membershipCapacity_postsUnlimited: () => 'posts:unlimited',
    membershipCapacity_featuredCredits: ({ count }: { count: number }) =>
      `featured-credits:${count}`,
    membershipCapacity_featuredSlots: ({ count }: { count: number }) =>
      `featured-slots:${count}`,
    membershipCapacity_featuredEveryPost: () => 'featured:every',
    membershipCapacity_featuredNoneOfThem: () => 'featured:none-following',
    membershipCapacity_featuredNone: () => 'featured:none',
    planFeature_liveDays: ({ days }: { days: string }) => `days:${days}`,
    membershipBenefit_postingDiscount: ({ percent }: { percent: string }) =>
      `discount:${percent}`,
    employerLanding_featureProfileUnlocks: ({ count }: { count: number }) =>
      `unlocks:${count}`,
    membershipBenefit_talentMessagesUnlimited: () => 'messages:unlimited',
    planFeature_unlimitedValue: ({ name }: { name: string }) =>
      `unlimited:${name}`,
    planFeature_countedValue: ({
      name,
      value,
    }: {
      name: string;
      value: string;
    }) => `${value}:${name}`,
  },
}));

import {
  configuredMembershipCapacitySentence,
  membershipCapacitySentence,
  planBenefitLines,
} from './plan-benefits';

import type { Plan } from '@cavuno/board';

function plan(values: Record<string, string>): Pick<Plan, 'features'> {
  return {
    features: Object.fromEntries(
      Object.entries(values).map(([key, value]) => [
        key,
        { value, name: key, dataType: 'string' },
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
    ).toBe('credits:3. featured-credits:1');
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
    ).toBe('slots:10. featured-slots:2');
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
    ).toBe('posts:unlimited. featured:every');
  });

  it('says none of them can be featured when the plan features nothing', () => {
    expect(
      membershipCapacitySentence(plan({ 'jobs.included_posts': '1' })),
    ).toBe('credits:1. featured:none-following');
  });

  it('stands alone as "No featured jobs" when there is no posting capacity', () => {
    expect(membershipCapacitySentence(plan({}))).toBe('featured:none');
    expect(configuredMembershipCapacitySentence(plan({}))).toBeNull();
  });
});

describe('plan benefit lines', () => {
  it('renders duration, the member discount and talent allowances in order', () => {
    expect(
      planBenefitLines(
        plan({
          'jobs.included_posts': '3',
          'jobs.duration_days': '60',
          'jobs.posting_discount_percent': '20',
          'talent.profile_unlocks': '5',
          'talent.messages_sent': 'unlimited',
        }),
      ),
    ).toEqual(['days:60', 'discount:20', 'unlocks:5', 'messages:unlimited']);
  });

  it('names the listing duration instead of echoing its dashboard label', () => {
    // Every membership plan carries `jobs.duration_days` (seeded default 30),
    // so without a named line every /memberships page read
    // "30 Job Duration (Days)".
    expect(
      planBenefitLines(
        plan({ 'jobs.included_posts': '1', 'jobs.duration_days': '60' }),
      ),
    ).toEqual(['days:60']);
  });

  it('promises no listing duration to a plan that grants no listings', () => {
    // A talent-access-only membership still carries the seeded
    // `jobs.duration_days`. Naming it would advertise a listing length for
    // listings the plan does not include.
    expect(
      planBenefitLines(
        plan({
          // Seeded `jobs.max_active` is '1', so the gate only bites once an
          // operator zeroes the cap — which is what a talent-only plan does.
          'jobs.max_active': '0',
          'jobs.duration_days': '30',
          'talent.profile_unlocks': '50',
        }),
      ),
    ).toEqual(['unlocks:50']);
  });

  it('renders no line for the featured-selection mechanism', () => {
    // `auto` is not a number, so the generic line read "auto Feature Selection
    // Mode". It decides how featured jobs are picked; it is not a benefit.
    expect(
      planBenefitLines(plan({ 'jobs.feature_selection_mode': 'auto' })),
    ).toEqual([]);
  });

  it('keeps the duration when no cap row was written at all', () => {
    // `PUT /v1/plans/{id}/features` REPLACES the set, so a plan can end up with
    // no `jobs.max_active` row. The platform reads that as no cap, not zero
    // slots, so the member can post and the duration is a real benefit.
    expect(
      planBenefitLines(
        plan({ 'jobs.included_posts': '0', 'jobs.duration_days': '30' }),
      ),
    ).toEqual(['days:30']);
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
      '2:conference tickets',
      'unlimited:support hours',
    ]);
  });
});
