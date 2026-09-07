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

  it('does not compose a listing subtitle for a talent-access plan', () => {
    expect(
      planDescription(
        {
          name: 'Candidate search',
          description: 'Find and contact candidates',
          purpose: 'talent_access',
          featureSummary: {
            durationDays: 30,
            maxActiveJobs: 1,
            featuredSlots: 0,
          },
        },
        'en',
      ),
    ).toBe('Find and contact candidates');
  });
});

describe('name-mapped plans respect listing entitlements', () => {
  it.each(['Free', 'Featured listing'])(
    'does not give %s talent access a listing subtitle',
    (name) => {
      expect(
        planDescription(
          {
            name,
            purpose: 'talent_access',
            description: 'Talent search',
            featureSummary: {
              durationDays: 30,
              maxActiveJobs: 1,
              featuredSlots: 0,
            },
          },
          'en',
        ),
      ).toBe('Talent search');
    },
  );
  it('does not give a zero-job membership a mapped listing subtitle', () => {
    expect(
      planDescription(
        {
          name: 'Free',
          purpose: 'membership',
          description: 'Member access',
          featureSummary: {
            durationDays: 60,
            maxActiveJobs: 0,
            featuredSlots: 0,
          },
        },
        'en',
      ),
    ).toBe('Member access');
  });
});
