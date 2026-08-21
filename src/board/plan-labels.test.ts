import { describe, expect, it } from 'vitest';

import { planDescription, planName } from './plan-labels';

describe('plan copy resolution tiers', () => {
  it('name-mapped plans use the catalog copy', () => {
    expect(planDescription({ name: 'Free' }, 'en')).toBe(
      'A 30 day standard listing',
    );
  });

  it('unmapped plans compose from the structured featureSummary', () => {
    const plan = {
      name: 'Enterprise blast',
      description: 'Operator prose in board language',
      featureSummary: { durationDays: 45, maxActiveJobs: 5, featuredSlots: 1 },
    };
    expect(planDescription(plan, 'en')).toBe(
      'A 45 day featured listing — Up to 5 active jobs',
    );
  });

  it('falls back to wire prose only without structure', () => {
    expect(
      planDescription({ name: 'Mystery', description: 'Wire words' }, 'en'),
    ).toBe('Wire words');
    expect(planName({ name: 'Mystery' }, 'en')).toBe('Mystery');
  });
});
