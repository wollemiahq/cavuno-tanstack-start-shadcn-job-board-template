import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createJobsLocationLoader } from './-jobs-taxonomy-loaders';

import type { getJobsLocationPage as GetJobsLocationPage } from '../server/jobs-listing-pages';

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
      head: { meta: [], links: [] },
      jsonLd: [],
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
});
