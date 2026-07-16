import { describe, expect, it } from 'vitest';

import { jobsListingLoaderDeps, parseJobsSearch } from './jobs-search';

describe('parseJobsSearch', () => {
  it('parses the canonical listing query and URL-backed job selection', () => {
    expect(
      parseJobsSearch({
        q: 'product designer',
        remoteOption: 'remote',
        page: '3',
        selectedJob: 'staff-product-designer',
      }),
    ).toEqual({
      q: 'product designer',
      remoteOption: 'remote',
      page: 3,
      selectedJob: 'staff-product-designer',
    });
  });

  it('drops empty or non-string selections from the canonical URL', () => {
    expect(parseJobsSearch({ selectedJob: '  ' }).selectedJob).toBeUndefined();
    expect(parseJobsSearch({ selectedJob: 42 }).selectedJob).toBeUndefined();
  });

  it('accepts the hosted-board query parameter as the canonical job query', () => {
    expect(parseJobsSearch({ query: 'robotics engineer' })).toMatchObject({
      q: 'robotics engineer',
      page: undefined,
      selectedJob: undefined,
    });
  });
});

describe('jobsListingLoaderDeps', () => {
  it('keeps pane selection out of listing fetch dependencies', () => {
    const first = jobsListingLoaderDeps(
      parseJobsSearch({ q: 'design', selectedJob: 'first-job' }),
    );
    const second = jobsListingLoaderDeps(
      parseJobsSearch({ q: 'design', selectedJob: 'second-job' }),
    );

    expect(first).toEqual(second);
    expect(first).not.toHaveProperty('selectedJob');
  });
});
