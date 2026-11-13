/**
 * The canonical jobs listing at `/jobs` — parity with the hosted board,
 * whose canonical jobs listing is `/jobs` (the home `/` is a landing).
 * A board migrating hosted → headless keeps its indexed `/jobs` URL.
 * Same listing surface as `/`, distinct canonical.
 *
 * Head meta is computed in getJobsIndexPage so `@cavuno/board/seo` and the
 * jobSearch copy family stay out of the universal client entry.
 */
import { createFileRoute, redirect } from '@tanstack/react-router';

import {
  jobsIndexPageInput,
  jobsListingLoaderDeps,
  parseJobsIndexSearch,
} from '../lib/jobs-search';
import { getJobsIndexPage } from '../server/jobs-listing-pages';
import { JobsPage } from './-jobs-page';

import { jsonLdHeadScripts } from '@/components/json-ld';
import { workArrangementRedirect } from '@/lib/work-arrangement';

export const Route = createFileRoute('/jobs/')({
  // Full-bleed: the page opens with the gray hero band and owns its own
  // containers.
  staticData: { fullBleed: true, ownsMain: true, fillsViewport: true },
  validateSearch: parseJobsIndexSearch,
  // `?remoteOption=remote` is `/jobs/locations/remote`, unless job custom
  // field filters keep it here (see `workArrangementTarget`).
  beforeLoad: ({ search }) => {
    const target = workArrangementRedirect({}, search);
    if (target) throw redirect({ ...target, statusCode: 308 });
  },
  loaderDeps: ({ search }) => jobsListingLoaderDeps(search),
  loader: ({ deps }) => getJobsIndexPage({ data: jobsIndexPageInput(deps) }),
  head: ({ loaderData }) =>
    loaderData
      ? { ...loaderData.head, scripts: jsonLdHeadScripts(loaderData.jsonLd) }
      : {},
  component: JobsPage,
});
