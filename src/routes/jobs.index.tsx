/**
 * The canonical jobs listing at `/jobs` — parity with the hosted board,
 * whose canonical jobs listing is `/jobs` (the home `/` is a landing).
 * A board migrating hosted → headless keeps its indexed `/jobs` URL.
 * Same listing surface as `/`, distinct canonical.
 *
 * Head meta is computed in getJobsIndexPage so `@cavuno/board/seo` and the
 * jobSearch copy family stay out of the universal client entry.
 */
import { createFileRoute } from '@tanstack/react-router';

import { jobsListingLoaderDeps, parseJobsSearch } from '../lib/jobs-search';
import { pageToOffset } from '../lib/pagination';
import { getJobsIndexPage } from '../server/jobs-listing-pages';
import { JobsPage } from './-jobs-page';

import { jsonLdHeadScripts } from '@/components/json-ld';

const JOBS_PAGE_SIZE = 20;

export const Route = createFileRoute('/jobs/')({
  // Full-bleed: the page opens with the gray hero band and owns its own
  // containers.
  staticData: { fullBleed: true, ownsMain: true, fillsViewport: true },
  validateSearch: parseJobsSearch,
  loaderDeps: ({ search }) => jobsListingLoaderDeps(search),
  loader: async ({ deps }) => {
    const offset = pageToOffset(deps.page ?? 1, JOBS_PAGE_SIZE);
    return getJobsIndexPage({
      data: {
        q: deps.q,
        remoteOption: deps.remoteOption,
        employmentType: deps.employmentType,
        seniority: deps.seniority,
        sort: deps.sort,
        offset,
        limit: JOBS_PAGE_SIZE,
      },
    });
  },
  head: ({ loaderData }) =>
    loaderData
      ? { ...loaderData.head, scripts: jsonLdHeadScripts(loaderData.jsonLd) }
      : {},
  component: JobsPage,
});
