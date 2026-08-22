/**
 * The canonical jobs listing at `/jobs` — parity with the hosted board,
 * whose canonical jobs listing is `/jobs` (the home `/` is a landing).
 * A board migrating hosted → headless keeps its indexed `/jobs` URL.
 * Same listing surface as `/`, distinct canonical.
 *
 * Head meta is computed in getJobsIndexPage so `@cavuno/board/seo` and the
 * jobSearch copy family stay out of the universal client entry.
 */
import { createFileRoute, notFound } from '@tanstack/react-router';

import { jobsListingLoaderDeps, parseJobsSearch } from '../lib/jobs-search';
import {
  exceedsOffsetPaginationWindow,
  isOutOfBoundsOffsetPage,
  pageToOffset,
} from '../lib/pagination';
import { getJobsIndexPage } from '../server/jobs-listing-pages';
import { JobsPage } from './-jobs-page';

import { jsonLdHeadScripts } from '@/components/json-ld';
import { JobsNotFound } from '@/components/board/jobs-not-found';

const JOBS_PAGE_SIZE = 20;

export const Route = createFileRoute('/jobs/')({
  // Full-bleed: the page opens with the gray hero band and owns its own
  // containers.
  staticData: { fullBleed: true, ownsMain: true, fillsViewport: true },
  validateSearch: parseJobsSearch,
  loaderDeps: ({ search }) => jobsListingLoaderDeps(search),
  loader: async ({ deps }) => {
    const page = deps.page ?? 1;
    const offset = pageToOffset(page, JOBS_PAGE_SIZE);
    if (exceedsOffsetPaginationWindow(offset, JOBS_PAGE_SIZE)) {
      throw notFound({ data: { kind: 'pagination' } });
    }
    const result = await getJobsIndexPage({
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
    if (
      isOutOfBoundsOffsetPage({
        page,
        offset,
        count: result.page.count,
        resultCount: result.page.data.length,
      })
    ) {
      throw notFound({ data: { kind: 'pagination' } });
    }
    return result;
  },
  head: ({ loaderData }) =>
    loaderData
      ? { ...loaderData.head, scripts: jsonLdHeadScripts(loaderData.jsonLd) }
      : {},
  component: JobsPage,
  notFoundComponent: JobsNotFound,
});
