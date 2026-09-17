import { describe, expect, it } from 'vitest';

import { parseCompanyJobsSearch } from './company-jobs-search';

describe('parseCompanyJobsSearch', () => {
  it('keeps the Stripe success flag and job id from the platform return URL', () => {
    expect(
      parseCompanyJobsSearch({
        checkout_success: '1',
        job_id: 'job-1',
      }),
    ).toEqual({ checkout_success: '1', job_id: 'job-1' });
  });

  it('accepts a same-origin posted flag', () => {
    expect(parseCompanyJobsSearch({ posted: '1', job_id: 'job-2' })).toEqual({
      posted: '1',
      job_id: 'job-2',
    });
  });

  it('drops empty or unexpected values', () => {
    expect(
      parseCompanyJobsSearch({ checkout_success: 'yes', job_id: '' }),
    ).toEqual({});
  });
});
