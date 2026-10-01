import { describe, expect, it } from 'vitest';

import {
  candidatePlanBenefits,
  candidatePlanEntitlements,
} from './candidate-plan-benefits';

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

describe('candidate plan compatibility permissions', () => {
  const feature = (value: string) => ({
    name: 'Configured capability',
    value,
    dataType: 'boolean',
    displayOrder: 0,
  });

  it('preserves legacy full access only when no candidate flags are configured', () => {
    const fullAccess = { listings: true, matches: true, job_alerts: true };
    expect(candidatePlanEntitlements({ features: {} })).toEqual(fullAccess);
    expect(
      candidatePlanEntitlements({
        features: {
          'job_seeker.matches': feature(''),
          'jobs.duration_days': feature('30'),
        },
      }),
    ).toEqual(fullAccess);
  });

  it('normalizes enabled flags and keeps missing or false flags disabled', () => {
    expect(
      candidatePlanEntitlements({
        features: {
          'job_seeker.listings': feature('false'),
          'job_seeker.matches': feature(' YES '),
        },
      }),
    ).toEqual({ listings: false, matches: true, job_alerts: false });
    expect(
      candidatePlanEntitlements({
        features: {
          'job_seeker.matches': feature(' FALSE '),
        },
      }),
    ).toEqual({ listings: false, matches: false, job_alerts: false });
    expect(
      candidatePlanBenefits({
        features: {
          'job_seeker.listings': feature(' 1 '),
          'job_seeker.matches': feature(' TRUE '),
          'job_seeker.job_alerts': feature('yes'),
        },
      }),
    ).toHaveLength(3);
  });
});
