import { describe, expect, it } from 'vitest';

import { publicJobFixture } from '../routes/-route-test-fixtures';
import {
  jobAlertDefaultsFromJob,
  jobAlertDefaultsFromSearch,
} from './job-alert-defaults';

describe('jobAlertDefaultsFromJob', () => {
  it('anchors on the job instead of sending its categories and skills', () => {
    const job = publicJobFixture('media-lead');
    const defaults = jobAlertDefaultsFromJob({
      ...job,
      categories: [{ slug: 'media', name: 'Media & Communication' }],
      skills: [{ slug: 'copywriting', name: 'Copywriting' }],
    });

    expect(defaults.context).toEqual({
      source: 'job_detail',
      jobId: job.id,
      jobSlug: job.slug ?? undefined,
    });
    expect(defaults.filters).not.toHaveProperty('jobFunctions');
    // A similar-job alert takes no keywords.
    expect(defaults.filters.query).toBeUndefined();
  });

  it('keeps the alert near the job’s most specific place', () => {
    const job = publicJobFixture('media-lead');
    const defaults = jobAlertDefaultsFromJob({
      ...job,
      placeHierarchy: [
        { slug: 'germany', canonicalSlug: 'germany', name: 'Germany' },
        { slug: 'berlin', canonicalSlug: 'berlin', name: 'Berlin' },
      ],
    });

    expect(defaults.filters.placeSlugs).toEqual(['berlin']);
  });
});

describe('jobAlertDefaultsFromSearch', () => {
  it('sends the query the page ran as keywords, not as a job function', () => {
    const defaults = jobAlertDefaultsFromSearch({
      query: '  Python developer ',
      source: 'board_home',
    });

    expect(defaults).toEqual({
      label: 'Python developer',
      filters: { query: 'Python developer', placeSlugs: undefined },
      context: { source: 'board_home' },
    });
  });

  it('keeps the location slug next to the query on location pages', () => {
    const defaults = jobAlertDefaultsFromSearch({
      query: 'Nursing',
      locationSlug: 'berlin',
    });

    expect(defaults.filters).toEqual({
      query: 'Nursing',
      placeSlugs: ['berlin'],
    });
    expect(defaults.context).toEqual({ source: 'jobs_list' });
  });

  it('sends no keywords for a blank query', () => {
    const defaults = jobAlertDefaultsFromSearch({
      query: '   ',
      locationSlug: 'berlin',
    });

    expect(defaults.filters.query).toBeUndefined();
    expect(defaults.filters.placeSlugs).toEqual(['berlin']);
  });

  it('caps keywords at the 200 characters the API accepts', () => {
    const defaults = jobAlertDefaultsFromSearch({ query: 'a'.repeat(250) });

    expect(defaults.filters.query).toHaveLength(200);
  });
});
