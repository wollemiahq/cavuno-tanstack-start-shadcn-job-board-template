import { describe, expect, it } from 'vitest';

import { planDescription, planName } from './plan-labels';

describe('plan copy resolution tiers', () => {
  it('name-mapped plans use the rich translation', () => {
    expect(planDescription({ name: 'Free' }, 'de')).toBe(
      'Eine Standard-Anzeige für 30 Tage',
    );
  });

  it('unmapped plans compose from the structured featureSummary', () => {
    const plan = {
      name: 'Enterprise blast',
      description: 'Operator prose in board language',
      featureSummary: { durationDays: 45, maxActiveJobs: 5, featuredSlots: 1 },
    };
    expect(planDescription(plan, 'de')).toBe(
      'Eine hervorgehobene Anzeige für 45 Tage — Bis zu 5 aktive Anzeigen',
    );
  });

  it('falls back to wire prose only without structure', () => {
    expect(
      planDescription({ name: 'Mystery', description: 'Wire words' }, 'de'),
    ).toBe('Wire words');
    expect(planName({ name: 'Mystery' }, 'de')).toBe('Mystery');
  });
});
