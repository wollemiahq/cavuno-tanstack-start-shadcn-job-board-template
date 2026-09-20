import { describe, expect, it } from 'vitest';

import { candidatePlanBenefits } from './candidate-plan-benefits';

describe('candidate plan benefits', () => {
  it('shows only enabled candidate capabilities', () => {
    const feature = (name: string, value: string) => ({
      name,
      value,
      dataType: 'boolean',
      displayOrder: 0,
    });
    expect(
      candidatePlanBenefits({
        features: {
          'job_seeker.listings': feature('Full job listings', 'true'),
          'job_seeker.matches': feature('Job matching', 'true'),
          'job_seeker.job_alerts': feature('Job alerts', 'false'),
          'jobs.duration_days': feature('Listing duration', '30'),
        },
      }),
    ).toEqual(['Full job listings', 'Job matching']);
    expect(candidatePlanBenefits({ features: {} })).toEqual([]);
  });
});
