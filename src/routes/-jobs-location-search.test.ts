import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getJobsLocationPage } = vi.hoisted(() => ({
  getJobsLocationPage: vi.fn(),
}));

vi.mock('../server/jobs-listing-pages', () => ({
  getJobsLocationPage,
}));

vi.mock('../server/queries', () => ({
  resolvePlace: vi.fn().mockResolvedValue({
    id: 'sydney',
    slug: 'sydney',
    displayName: 'Sydney',
  }),
}));

vi.mock('@/routes/-programmatic-jobs-view', () => ({
  PROGRAMMATIC_JOBS_PAGE_SIZE: 20,
  ProgrammaticJobsView: () => null,
}));

vi.mock('../server/account', () => ({
  saveJob: vi.fn(),
}));

vi.mock('./-use-location-suggestions', () => ({
  useLocationSuggestions: vi.fn(),
}));

import { Route } from './jobs.locations.$location.index';

describe('location jobs route — combined keyword and place filtering', () => {
  beforeEach(() => {
    getJobsLocationPage.mockReset();
    getJobsLocationPage.mockResolvedValue({
      list: { data: [], count: 0 },
      seo: { origin: 'https://example.com' },
      relatedSearches: undefined,
      head: {},
    });
  });

  it('passes q to the jobs query instead of silently dropping the keyword', async () => {
    const loader = Route.options.loader;
    if (typeof loader !== 'function') {
      throw new Error('The location route does not define a callable loader');
    }

    await loader({
      params: { location: 'sydney' },
      deps: { q: 'robotics' },
    } as never);

    expect(getJobsLocationPage).toHaveBeenCalledWith({
      data: expect.objectContaining({
        locationSlug: 'sydney',
        q: 'robotics',
      }),
    });
  });
});
