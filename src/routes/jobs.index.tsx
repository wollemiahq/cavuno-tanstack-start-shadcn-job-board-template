import { listingHead } from '@cavuno/board/seo';
/**
 * The canonical jobs listing at `/jobs` — parity with the hosted board,
 * whose canonical jobs listing is `/jobs` (the home `/` is a landing).
 * A board migrating hosted → headless keeps its indexed `/jobs` URL.
 * Same listing surface as `/`, distinct canonical.
 */
import { createFileRoute } from '@tanstack/react-router';

import { jobsListingLoaderDeps, parseJobsSearch } from '../lib/jobs-search';
import { pageToOffset } from '../lib/pagination';
import { getSeoBase, listJobs, searchJobs } from '../server/queries';
import { JobsPage } from './-jobs-page';

import { jobSearchCopy } from '@/copy-groups/job-search';

const JOBS_PAGE_SIZE = 20;

export const Route = createFileRoute('/jobs/')({
  // Full-bleed: the page opens with the gray hero band and owns its own
  // containers.
  staticData: { fullBleed: true, ownsMain: true, fillsViewport: true },
  validateSearch: parseJobsSearch,
  loaderDeps: ({ search }) => jobsListingLoaderDeps(search),
  loader: async ({ deps }) => {
    const offset = pageToOffset(deps.page ?? 1, JOBS_PAGE_SIZE);
    const [page, seo] = await Promise.all([
      deps.q
        ? searchJobs({
            data: {
              query: deps.q,
              filters: {
                remoteOption: deps.remoteOption
                  ? [deps.remoteOption]
                  : undefined,
                employmentType: deps.employmentType
                  ? [deps.employmentType]
                  : undefined,
                seniority: deps.seniority?.length ? deps.seniority : undefined,
              },
              sort: deps.sort,
              offset,
              limit: JOBS_PAGE_SIZE,
            },
          })
        : listJobs({
            data: {
              remoteOption: deps.remoteOption ? [deps.remoteOption] : undefined,
              employmentType: deps.employmentType
                ? [deps.employmentType]
                : undefined,
              seniority: deps.seniority?.length ? deps.seniority : undefined,
              sort: deps.sort,
              offset,
              limit: JOBS_PAGE_SIZE,
              fields: '+description',
            },
          }),
      getSeoBase(),
    ]);
    // Related-search chips and card tag pills link directly: every slug the
    // API emits resolves (ADR-0099 platform guarantee) — no re-verification.
    const relatedSearches =
      'relatedSearches' in page ? page.relatedSearches : undefined;
    return { page, seo, relatedSearches };
  },
  head: ({ loaderData }) =>
    loaderData
      ? listingHead({
          ...loaderData.seo,
          path: '/jobs',
          heading: jobSearchCopy(loaderData.seo.language, loaderData.seo.labels)
            .headingJobs,
          count: loaderData.page.count,
        })
      : {},
  component: JobsPage,
});
