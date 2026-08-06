/**
 * Programmatic location page — `/jobs/locations/:location` (hosted parity:
 * `boards/[slug]/(main)/jobs/locations/[location]/page.tsx`). Place resolve +
 * list + head run in ONE server fn (404 / 308 like the taxonomy pages); the
 * API filters the listing to a geo radius around that place (`location` param).
 *
 * Head meta is computed in getJobsLocationPage so `@cavuno/board/seo` stays
 * out of the universal client entry.
 */
import { createFileRoute, notFound, redirect } from '@tanstack/react-router';

import { jobsListingLoaderDeps, parseJobsSearch } from '../lib/jobs-search';
import { pageToOffset } from '../lib/pagination';
import { m } from '../paraglide/messages';
import { saveJob } from '../server/account';
import { getJobsLocationPage } from '../server/jobs-listing-pages';

import { JobsNotFound } from '@/components/board/jobs-not-found';
import { jsonLdHeadScripts } from '@/components/json-ld';
import { PROGRAMMATIC_JOBS_PAGE_SIZE } from '@/routes/-programmatic-jobs-constants';
import { ProgrammaticJobsView } from '@/routes/-programmatic-jobs-view';

export const Route = createFileRoute('/jobs/locations/$location/')({
  staticData: { fullBleed: true, ownsMain: true, fillsViewport: true },
  validateSearch: parseJobsSearch,
  loaderDeps: ({ search }) => jobsListingLoaderDeps(search),
  loader: async ({ params, deps }) => {
    // ONE server fn: place resolve joins the listing + SEO batch so we do
    // not pay a serial resolve hop before the real page read.
    const result = await getJobsLocationPage({
      data: {
        locationSlug: params.location,
        q: deps.q,
        remoteOption: deps.remoteOption,
        employmentType: deps.employmentType,
        seniority: deps.seniority,
        sort: deps.sort,
        offset: pageToOffset(deps.page ?? 1, PROGRAMMATIC_JOBS_PAGE_SIZE),
        limit: PROGRAMMATIC_JOBS_PAGE_SIZE,
      },
    });
    if (result.kind === 'not_found') throw notFound();
    if (result.kind === 'redirect') {
      throw redirect({
        to: '/jobs/locations/$location',
        params: { location: result.to },
        statusCode: 308,
      });
    }
    return result;
  },
  head: ({ loaderData }) =>
    loaderData
      ? { ...loaderData.head, scripts: jsonLdHeadScripts(loaderData.jsonLd) }
      : {},
  component: LocationPage,
  notFoundComponent: () => <JobsNotFound />,
});

function LocationPage() {
  const { place, list, relatedSearches } = Route.useLoaderData();
  const { location } = Route.useParams();
  const search = Route.useSearch();
  return (
    <ProgrammaticJobsView
      heading={m.locationPage_jobsHeading({ place: place.displayName })}
      count={list.count}
      gatedCount={list.gatedCount}
      jobs={list.data}
      page={search.page ?? 1}
      pageSize={PROGRAMMATIC_JOBS_PAGE_SIZE}
      relatedSearches={relatedSearches}
      filters={search}
      onSaveJob={async (jobId) => {
        await saveJob({ data: { jobId } });
      }}
      location={{ slug: location, label: place.displayName }}
    />
  );
}
