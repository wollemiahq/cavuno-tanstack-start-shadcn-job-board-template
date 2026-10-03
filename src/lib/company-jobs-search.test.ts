import { defaultStringifySearch } from '@tanstack/react-router';
import { describe, expect, it } from 'vitest';

import { parseCompanyJobsSearch } from './company-jobs-search';

describe('parseCompanyJobsSearch', () => {
  it('keeps the Stripe success flag and job id from the platform return URL', () => {
    expect(
      parseCompanyJobsSearch({
        checkout_success: '1',
        job_id: 'job-1',
      }),
    ).toEqual({ checkout_success: 1, job_id: 'job-1' });
  });

  it('accepts a same-origin posted flag', () => {
    expect(parseCompanyJobsSearch({ posted: '1', job_id: 'job-2' })).toEqual({
      posted: 1,
      job_id: 'job-2',
    });
  });

  it('keeps the awaiting-review flag a held post returns with', () => {
    expect(
      parseCompanyJobsSearch({ posted: '1', review: '1', job_id: 'job-3' }),
    ).toEqual({ posted: 1, review: 1, job_id: 'job-3' });
  });

  it('keeps the flag a saved edit returns with', () => {
    expect(parseCompanyJobsSearch({ edited: 1, job_id: 'job-4' })).toEqual({
      edited: 1,
      job_id: 'job-4',
    });
  });

  it('drops empty or unexpected values', () => {
    expect(
      parseCompanyJobsSearch({ checkout_success: 'yes', job_id: '' }),
    ).toEqual({});
  });

  it('round-trips through the router as plain `=1` flags', () => {
    const search = parseCompanyJobsSearch({
      posted: '1',
      review: '1',
      edited: '1',
      job_id: 'job-5',
    });
    expect(defaultStringifySearch(search)).toBe(
      '?posted=1&review=1&edited=1&job_id=job-5',
    );
  });
});
