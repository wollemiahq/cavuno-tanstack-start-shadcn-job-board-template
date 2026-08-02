import { listingHead } from '@cavuno/board/seo';
/**
 * Programmatic location + category page — `/jobs/locations/:location/:keyword`
 * (hosted parity: `…/jobs/locations/[location]/[keyword]/page.tsx`). Both the
 * place and the category must resolve; the API seeds the search with the
 * category's source name AND filters to the place's radius.
 */
import { createFileRoute, notFound, redirect } from '@tanstack/react-router';

import { jobsListingLoaderDeps, parseJobsSearch } from '../lib/jobs-search';
import { pageToOffset } from '../lib/pagination';
import { m } from '../paraglide/messages';
import { saveJob } from '../server/account';
import {
  getSeoBase,
  listJobs,
  resolveCategory,
  resolvePlace,
} from '../server/queries';

import { JobsNotFound } from '@/components/board/jobs-not-found';
import {
  ProgrammaticJobsView,
  PROGRAMMATIC_JOBS_PAGE_SIZE,
} from '@/routes/-programmatic-jobs-view';

export const Route = createFileRoute('/jobs/locations/$location/$keyword')({
  staticData: { fullBleed: true, ownsMain: true, fillsViewport: true },
  validateSearch: parseJobsSearch,
  loaderDeps: ({ search }) => jobsListingLoaderDeps(search),
  loader: async ({ params, deps }) => {
    const [place, category] = await Promise.all([
      resolvePlace({ data: { slug: params.location } }),
      resolveCategory({ data: { slug: params.keyword } }),
    ]);
    if (!place || !category) throw notFound();
    if (place.redirectTo || category.redirectTo) {
      throw redirect({
        to: '/jobs/locations/$location/$keyword',
        params: {
          location: place.redirectTo ?? params.location,
          keyword: category.redirectTo ?? params.keyword,
        },
        statusCode: 308,
      });
    }
    const [list, seo] = await Promise.all([
      listJobs({
        data: {
          location: params.location,
          category: params.keyword,
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
    const relatedSearches = list.relatedSearches;
    return { place, category, list, seo, relatedSearches };
  },
  head: ({ loaderData, params }) =>
    loaderData
      ? listingHead({
          ...loaderData.seo,
          path: `/jobs/locations/${params.location}/${params.keyword}`,
          heading: m.locationCategoryPage_jobsHeading({
            category: loaderData.category.displayName,
            place: loaderData.place.displayName,
          }),
          count: loaderData.list.count,
        })
      : {},
  component: LocationCategoryPage,
  notFoundComponent: () => <JobsNotFound />,
});

function LocationCategoryPage() {
  const { place, category, list, seo, relatedSearches } = Route.useLoaderData();
  const { location } = Route.useParams();
  const search = Route.useSearch();
  return (
    <ProgrammaticJobsView
      heading={m.locationCategoryPage_jobsHeading({
        category: category.displayName,
        place: place.displayName,
      })}
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
