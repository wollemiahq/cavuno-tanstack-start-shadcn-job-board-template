import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createJobsLocationLoader } from './-jobs-taxonomy-loaders';
import { PROGRAMMATIC_JOBS_PAGE_SIZE } from './-programmatic-jobs-constants';
import { Route as LocationRoute } from './jobs.locations.$location.index';

import type { getJobsLocationPage as GetJobsLocationPage } from '../server/jobs-listing-pages';
import { jobsListingLoaderDeps, parseJobsSearch } from '@/lib/jobs-search';
import { listingPageHref } from '@/lib/pagination';

const getJobsLocationPage = vi.fn<typeof GetJobsLocationPage>();
const loadLocationJobs = createJobsLocationLoader(getJobsLocationPage);

function locationJobsLoaderContext() {
  return {
    params: { location: 'sydney' },
    deps: { q: 'robotics' },
  };
}

describe('location jobs route — combined keyword and place filtering', () => {
  beforeEach(() => {
    getJobsLocationPage.mockReset();
    getJobsLocationPage.mockResolvedValue({
      kind: 'ok',
      place: {
        object: 'taxonomy_resolution',
        type: 'place',
        sourceSlug: 'sydney',
        canonicalSlug: 'sydney',
        displayName: 'Sydney',
        redirectTo: null,
        geo: {
          lat: -33.8688,
          lng: 151.2093,
          countryCode: 'AU',
          regionCode: 'NSW',
          region: 'New South Wales',
          city: 'Sydney',
          locality: null,
          placeType: 'city',
        },
      },
      list: {
        object: 'list',
        url: '/v1/jobs',
        data: [],
        hasMore: false,
        nextCursor: null,
        count: 0,
      },
      seo: {
        boardName: 'Example Jobs',
        language: 'en',
        origin: 'https://example.com',
      },
      relatedSearches: undefined,
      searchRadius: null,
      head: { meta: [], links: [] },
      jsonLd: [],
      countCapped: false,
      breadcrumbTrail: [
        { name: 'Home', href: '/' },
        { name: 'Jobs', href: '/jobs' },
        { name: 'Sydney' },
      ],
    });
  });

  it('passes q to the jobs query instead of silently dropping the keyword', async () => {
    await loadLocationJobs(locationJobsLoaderContext());

    expect(getJobsLocationPage).toHaveBeenCalledWith({
      data: expect.objectContaining({
        locationSlug: 'sydney',
        q: 'robotics',
      }),
    });
  });

  it('threads a custom employment type from the URL into the jobs query', async () => {
    await loadLocationJobs({
      params: { location: 'sydney' },
      deps: jobsListingLoaderDeps(
        parseJobsSearch({ customEmploymentType: 'casual' }),
      ),
    });

    expect(getJobsLocationPage).toHaveBeenCalledWith({
      data: expect.objectContaining({ customEmploymentType: 'casual' }),
    });
  });
});

describe('location jobs route — search distance', () => {
  it('passes the URL `within` to the page read', async () => {
    getJobsLocationPage.mockResolvedValue({ kind: 'not_found' });

    await expect(
      loadLocationJobs({
        params: { location: 'sydney' },
        deps: { within: 25 },
      }),
    ).rejects.toBeDefined();

    expect(getJobsLocationPage).toHaveBeenCalledWith({
      data: expect.objectContaining({ locationSlug: 'sydney', within: 25 }),
    });
  });
});

describe('location jobs route — `within` in the URL', () => {
  /** The real location route's search handling, loaded as the server does. */
  async function serverLoad(href: string) {
    const loadPage = vi.fn<typeof GetJobsLocationPage>();
    loadPage.mockResolvedValue({ kind: 'not_found' });
    const rootRoute = createRootRoute();
    const locationRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/jobs/locations/$location',
      validateSearch: LocationRoute.options.validateSearch,
      loaderDeps: ({ search }) => jobsListingLoaderDeps(search),
      loader: createJobsLocationLoader(loadPage),
    });
    const router = createRouter({
      routeTree: rootRoute.addChildren([locationRoute]),
      history: createMemoryHistory({ initialEntries: [href] }),
      isServer: true,
    });
    await router.load();
    return { router, loadPage };
  }

  it('redirects an invalid `within` to the plain location URL', async () => {
    const { router, loadPage } = await serverLoad(
      '/jobs/locations/houston?within=7',
    );

    // What the SSR handler answers with: a redirect to the plain URL.
    const result = router._serverResult;
    expect(result?.type).toBe('redirect');
    if (result?.type !== 'redirect') return;
    expect(result.redirect.options.href).toBe('/jobs/locations/houston');
    expect(loadPage).not.toHaveBeenCalled();
  });

  it('keeps `within` on a later page and in its page links', async () => {
    const { router, loadPage } = await serverLoad(
      '/jobs/locations/houston?page=2&within=10',
    );

    expect(router._serverResult?.type).not.toBe('redirect');
    expect(loadPage).toHaveBeenCalledWith({
      data: expect.objectContaining({
        locationSlug: 'houston',
        within: 10,
        offset: PROGRAMMATIC_JOBS_PAGE_SIZE,
      }),
    });
    const next = new URL(
      listingPageHref(router.state.location.href, 3, ['selectedJob']),
      'https://board.local',
    );
    expect(next.searchParams.get('within')).toBe('10');
    expect(next.searchParams.get('page')).toBe('3');
  });
});
