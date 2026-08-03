import { listingHead } from '@cavuno/board/seo';
/**
 * Programmatic location page — `/jobs/locations/:location` (hosted parity:
 * `boards/[slug]/(main)/jobs/locations/[location]/page.tsx`). Resolve the place
 * slug (404 / 308 like the taxonomy pages), then the API filters the listing to
 * a geo radius around that place (`location` param).
 */
import { createFileRoute, notFound, redirect } from '@tanstack/react-router';

import { jobsListingLoaderDeps, parseJobsSearch } from '../lib/jobs-search';
import { pageToOffset } from '../lib/pagination';
import { m } from '../paraglide/messages';
import { saveJob } from '../server/account';
import {
  getSeoBase,
  listJobs,
  resolvePlace,
  searchJobs,
} from '../server/queries';

import { JobsNotFound } from '@/components/board/jobs-not-found';
import { PROGRAMMATIC_JOBS_PAGE_SIZE } from '@/routes/-programmatic-jobs-constants';
import { ProgrammaticJobsView } from '@/routes/-programmatic-jobs-view';

export const Route = createFileRoute('/jobs/locations/$location/')({
  staticData: { fullBleed: true, ownsMain: true, fillsViewport: true },
  validateSearch: parseJobsSearch,
  loaderDeps: ({ search }) => jobsListingLoaderDeps(search),
  loader: async ({ params, deps }) => {
    const place = await resolvePlace({ data: { slug: params.location } });
    if (!place) throw notFound();
    if (place.redirectTo) {
      throw redirect({
        to: '/jobs/locations/$location',
        params: { location: place.redirectTo },
        statusCode: 308,
      });
    }
    const [list, seo] = await Promise.all([
      deps.q
        ? searchJobs({
            data: {
              query: deps.q,
              filters: {
                location: params.location,
                remoteOption: deps.remoteOption
                  ? [deps.remoteOption]
                  : undefined,
                employmentType: deps.employmentType
                  ? [deps.employmentType]
                  : undefined,
                seniority: deps.seniority?.length ? deps.seniority : undefined,
              },
              sort: deps.sort,
              offset: pageToOffset(deps.page ?? 1, PROGRAMMATIC_JOBS_PAGE_SIZE),
              limit: PROGRAMMATIC_JOBS_PAGE_SIZE,
            },
          })
        : listJobs({
            data: {
              location: params.location,
              remoteOption: deps.remoteOption ? [deps.remoteOption] : undefined,
              employmentType: deps.employmentType
                ? [deps.employmentType]
                : undefined,
              seniority: deps.seniority?.length ? deps.seniority : undefined,
              sort: deps.sort,
              offset: pageToOffset(deps.page ?? 1, PROGRAMMATIC_JOBS_PAGE_SIZE),
              limit: PROGRAMMATIC_JOBS_PAGE_SIZE,
            },
          }),
      getSeoBase(),
    ]);
    const rawRelated =
      'relatedSearches' in list ? list.relatedSearches : undefined;
    const relatedSearches = rawRelated;
    return { place, list, seo, relatedSearches };
  },
  head: ({ loaderData, params }) =>
    loaderData
      ? listingHead({
          ...loaderData.seo,
          path: `/jobs/locations/${params.location}`,
          heading: m.locationPage_jobsHeading({
            place: loaderData.place.displayName,
          }),
          count: loaderData.list.count,
        })
      : {},
  component: LocationPage,
  notFoundComponent: () => <JobsNotFound />,
});

function LocationPage() {
  const { place, list, seo, relatedSearches } = Route.useLoaderData();
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
      origin={seo.origin}
      filters={search}
      onSaveJob={async (jobId) => {
        await saveJob({ data: { jobId } });
      }}
      location={{ slug: location, label: place.displayName }}
    />
  );
}
