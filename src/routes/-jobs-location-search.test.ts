import { beforeEach, describe, expect, it, vi } from 'vitest';

const { listJobs, searchJobs } = vi.hoisted(() => ({
  listJobs: vi.fn(),
  searchJobs: vi.fn(),
}));

vi.mock('../server/queries', () => ({
  getSeoBase: vi.fn().mockResolvedValue({}),
  listJobs,
  searchJobs,
  resolvePlace: vi.fn().mockResolvedValue({
    id: 'sydney',
    slug: 'sydney',
    displayName: 'Sydney',
  }),
}));

vi.mock('../components/programmatic-jobs-view', () => ({
  PROGRAMMATIC_JOBS_PAGE_SIZE: 20,
  ProgrammaticJobsView: () => null,
}));

vi.mock('./-use-location-suggestions', () => ({
  useLocationSuggestions: vi.fn(),
}));

import { Route } from './jobs.locations.$location.index';

describe('location jobs route — combined keyword and place filtering', () => {
  beforeEach(() => {
    listJobs.mockReset();
    listJobs.mockResolvedValue({ data: [], count: 0 });
    searchJobs.mockReset();
    searchJobs.mockResolvedValue({ data: [], count: 0 });
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

    expect(searchJobs).toHaveBeenCalledWith({
      data: expect.objectContaining({
        query: 'robotics',
        filters: expect.objectContaining({
          location: 'sydney',
        }),
      }),
    });
    expect(listJobs).not.toHaveBeenCalled();
  });
});
