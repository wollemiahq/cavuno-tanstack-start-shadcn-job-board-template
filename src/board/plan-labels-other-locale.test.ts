import { describe, expect, it, vi } from 'vitest';

// Render as if the page is in a chrome locale other than the board language.
vi.mock('../paraglide/runtime', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../paraglide/runtime')>()),
  baseLocale: 'board-language',
}));

import { m } from '../paraglide/messages';
import { planDescription } from './plan-labels';

describe('plan descriptions on other-locale pages', () => {
  it('translates a job-posting plan instead of showing board-language prose', () => {
    expect(
      planDescription({
        name: 'Enterprise blast',
        description: 'Operator prose in board language',
        purpose: 'job_posting',
        featureSummary: {
          durationDays: 45,
          maxActiveJobs: 1,
          featuredSlots: 1,
        },
      }),
    ).toBe(m.planComposed_featuredListing({ days: 45 }));
  });
});
