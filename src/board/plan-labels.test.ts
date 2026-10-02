import { describe, expect, it } from 'vitest';

import { m } from '../paraglide/messages';
import { baseLocale } from '../paraglide/runtime';
import { planDescription, planName } from './plan-labels';

describe('plan copy resolution tiers', () => {
  it('name-mapped plans use the catalog copy', () => {
    expect(planDescription({ name: 'Free' }, 'en')).toBe(
      m.plan_free_description({}, { locale: 'en' }),
    );
  });

  it('unmapped plans compose from the structured featureSummary', () => {
    const plan = {
      name: 'Enterprise blast',
      featureSummary: { durationDays: 45, maxActiveJobs: 5, featuredSlots: 1 },
    };
    expect(planDescription(plan, 'en')).toBe(
      `${m.planComposed_featuredListing({ days: 45 }, { locale: 'en' })} — ${m.planComposed_maxActiveJobs({ count: 5 }, { locale: 'en' })}`,
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

describe('operator descriptions on board-language pages', () => {
  it.each(['Free', 'Enterprise blast'])(
    'shows the %s job-posting plan description as written',
    (name) => {
      const description = 'Logo on cards\nSocial auto-broadcast';
      expect(
        planDescription(
          {
            name,
            description,
            purpose: 'job_posting',
            featureSummary: {
              durationDays: 45,
              maxActiveJobs: 1,
              featuredSlots: 1,
            },
          },
          baseLocale,
        ),
      ).toBe(description);
    },
  );

  it('keeps the translated copy for an untouched seeded plan', () => {
    expect(
      planDescription(
        { name: 'Free', description: 'A 30 day standard listing' },
        baseLocale,
      ),
    ).toBe(m.plan_free_description({}, { locale: baseLocale }));
  });

  it('composes the summary when the description is blank', () => {
    expect(
      planDescription(
        {
          name: 'Enterprise blast',
          description: '  ',
          featureSummary: {
            durationDays: 45,
            maxActiveJobs: 1,
            featuredSlots: 1,
          },
        },
        baseLocale,
      ),
    ).toBe(
      m.planComposed_featuredListing({ days: 45 }, { locale: baseLocale }),
    );
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

describe('unlimited featured plans', () => {
  it('does not describe unlimited featured slots as a standard listing', () => {
    expect(
      planDescription(
        {
          name: 'Bull Shark',
          featureSummary: {
            durationDays: 30,
            maxActiveJobs: 3,
            featuredSlots: 0,
          },
          features: { 'jobs.featured_slots': { value: 'unlimited' } },
        },
        'en',
      ),
    ).toBe(
      `${m.planComposed_featuredListing({ days: 30 }, { locale: 'en' })} — ${m.planComposed_maxActiveJobs({ count: 3 }, { locale: 'en' })}`,
    );
  });
});

describe('audience plan descriptions', () => {
  it.each(['job_seeker', 'membership'])(
    'does not invent a listing description for %s plans',
    (purpose) => {
      expect(
        planDescription({
          name: 'Community',
          description: 'Benefits configured by the board',
          purpose,
          featureSummary: {
            durationDays: 30,
            maxActiveJobs: 5,
            featuredSlots: 1,
          },
        }),
      ).toBe('Benefits configured by the board');
    },
  );
});
