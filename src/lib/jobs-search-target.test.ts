import { describe, expect, it } from 'vitest';

import { resolveJobsSearchTarget } from './jobs-search-target';

const london = { slug: 'london', name: 'London' };
const react = { type: 'skill' as const, slug: 'react', name: 'React' };
const engineering = {
  type: 'category' as const,
  slug: 'engineering',
  name: 'Engineering',
};

describe('resolveJobsSearchTarget', () => {
  it('routes a skill and a location to the location+skill page', () => {
    expect(
      resolveJobsSearchTarget({
        query: 'React',
        location: london,
        term: react,
      }),
    ).toEqual({
      to: '/jobs/locations/$location/skills/$skill',
      params: { location: 'london', skill: 'react' },
    });
  });

  it('routes a category and a location to the location+keyword page', () => {
    expect(
      resolveJobsSearchTarget({
        query: 'Engineering',
        location: london,
        term: engineering,
      }),
    ).toEqual({
      to: '/jobs/locations/$location/$keyword',
      params: { location: 'london', keyword: 'engineering' },
    });
  });

  it('routes a skill without a location to the skill page', () => {
    expect(
      resolveJobsSearchTarget({
        query: 'React',
        location: null,
        term: react,
      }),
    ).toEqual({
      to: '/jobs/skills/$skill',
      params: { skill: 'react' },
    });
  });

  it('routes a category without a location to the category page', () => {
    expect(
      resolveJobsSearchTarget({
        query: 'Engineering',
        location: null,
        term: engineering,
      }),
    ).toEqual({
      to: '/jobs/$keyword',
      params: { keyword: 'engineering' },
    });
  });

  it('routes a location-only search onto the location page with the free-text query', () => {
    expect(
      resolveJobsSearchTarget({
        query: 'designer',
        location: london,
        term: null,
      }),
    ).toEqual({
      to: '/jobs/locations/$location',
      params: { location: 'london' },
      search: { q: 'designer' },
    });
  });

  it('routes a plain query to /jobs', () => {
    expect(
      resolveJobsSearchTarget({
        query: 'designer',
        location: null,
        term: null,
      }),
    ).toEqual({
      to: '/jobs',
      search: { q: 'designer' },
    });
  });

  it('carries staged listing filters onto a programmatic skill target', () => {
    expect(
      resolveJobsSearchTarget({
        query: 'React',
        location: null,
        term: react,
        filters: {
          remoteOption: 'remote',
          employmentType: 'full_time',
          seniority: ['senior'],
        },
      }),
    ).toEqual({
      to: '/jobs/skills/$skill',
      params: { skill: 'react' },
      search: {
        remoteOption: 'remote',
        employmentType: 'full_time',
        seniority: ['senior'],
      },
    });
  });

  it('carries staged listing filters onto the plain /jobs search', () => {
    expect(
      resolveJobsSearchTarget({
        query: 'designer',
        location: null,
        term: null,
        filters: { remoteOption: 'hybrid' },
      }),
    ).toEqual({
      to: '/jobs',
      search: { q: 'designer', remoteOption: 'hybrid' },
    });
  });
});
