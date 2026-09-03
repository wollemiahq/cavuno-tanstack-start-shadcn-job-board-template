import { describe, expect, it } from 'vitest';

import {
  membershipBenefitLines,
  membershipCapacitySentence,
} from './membership-view-model';

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

describe('membership benefit lines', () => {
  it('renders the member discount and talent allowances', () => {
    expect(
      membershipBenefitLines(
        plan({
          'jobs.posting_discount_percent': '20',
          'talent.unlocks_per_period': '5',
          'talent.messages_per_period': 'unlimited',
        }),
      ),
    ).toEqual([
      '20% off further job posts',
      '5 profile unlocks',
      'Unlimited messages',
    ]);
  });

  it('renders nothing for a membership that only carries posting capacity', () => {
    expect(membershipBenefitLines(plan({ 'jobs.included_posts': '2' }))).toEqual(
      [],
    );
  });
});
