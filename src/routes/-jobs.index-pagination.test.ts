import { isNotFound } from '@tanstack/react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getJobsIndexPage } = vi.hoisted(() => ({
  getJobsIndexPage: vi.fn(),
}));

vi.mock('../server/jobs-listing-pages', () => ({
  getJobsIndexPage,
}));

vi.mock('./-jobs-page', () => ({
  JobsPage: () => null,
}));

vi.mock('@/components/board/jobs-not-found', () => ({
  JobsNotFound: () => null,
}));

import { Route as JobsRoute } from './jobs.index';

function loader() {
  const load = JobsRoute.options.loader;
  if (typeof load !== 'function') {
    throw new Error('The jobs route does not define a callable loader');
  }
  return load;
}

beforeEach(() => {
  getJobsIndexPage.mockReset();
  getJobsIndexPage.mockResolvedValue({
    page: { data: [], count: 100 },
    relatedSearches: [],
    seo: {},
    head: {},
    jsonLd: [],
  });
});

describe('jobs index pagination bounds', () => {
  it('404s before calling the API when the requested window exceeds its limit', async () => {
    await expect(loader()({ deps: { page: 999 } } as never)).rejects.toSatisfy(
      isNotFound
    );
    expect(getJobsIndexPage).not.toHaveBeenCalled();
  });

  it('404s a later page beyond count but keeps an empty first page valid', async () => {
    getJobsIndexPage.mockResolvedValue({
      page: { data: [], count: 20 },
      relatedSearches: [],
      seo: {},
      head: {},
      jsonLd: [],
    });
    await expect(loader()({ deps: { page: 2 } } as never)).rejects.toSatisfy(
      isNotFound
    );

    getJobsIndexPage.mockResolvedValue({
      page: { data: [], count: 0 },
      relatedSearches: [],
      seo: {},
      head: {},
      jsonLd: [],
    });
    await expect(loader()({ deps: {} } as never)).resolves.toMatchObject({
      page: { count: 0 },
    });
  });
});
