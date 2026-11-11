import { describe, expect, it } from 'vitest';

import { customAttributeLines } from '../board/plan-benefits';
import { withNamedFeatures } from './post-plans';

import type { JobPostingPlan } from '@cavuno/board';

const plan: JobPostingPlan = {
  object: 'job_posting_plan',
  id: 'plan-featured',
  name: 'Featured',
  description: null,
  kind: 'one_time',
  billingInterval: null,
  purpose: 'job_posting',
  isRecommended: false,
  displayOrder: 0,
  invoiceOnly: false,
  publishTiming: null,
  netTermsDays: null,
  prices: [],
  features: [
    {
      key: 'custom.newsletter',
      value: 'true',
      name: 'Newsletter mention',
      dataType: 'boolean',
      displayOrder: 2,
    },
    {
      key: 'jobs.duration_days',
      value: null,
      name: 'Duration',
      dataType: 'integer',
      displayOrder: null,
    },
  ],
};

describe('withNamedFeatures', () => {
  it("labels an operator's custom attribute from the posting plan alone", async () => {
    // Members-only boards hide job-posting plans from the plan catalogue, so
    // the name has to come from the posting-plan read itself.
    const [named] = await withNamedFeatures(Promise.resolve([plan]));

    expect(named?.namedFeatures).toEqual({
      'custom.newsletter': {
        value: 'true',
        name: 'Newsletter mention',
        dataType: 'boolean',
        displayOrder: 2,
      },
    });
    const lines = customAttributeLines({
      features: named?.namedFeatures ?? {},
    });
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('Newsletter mention');
  });
});
