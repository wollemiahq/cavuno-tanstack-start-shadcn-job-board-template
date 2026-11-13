/**
 * Programmatic location + category page — `/jobs/locations/:location/:keyword`
 * (hosted parity: `…/jobs/locations/[location]/[keyword]/page.tsx`). Place and
 * category resolve + list + head run in ONE server fn; the API seeds the search
 * with the category's source name AND filters to the place's radius.
 *
 * Head meta is computed in getJobsLocationCategoryPage so `@cavuno/board/seo`
 * stays out of the universal client entry.
 */
import { createFileRoute, redirect } from '@tanstack/react-router';

import {
  jobsListingLoaderDeps,
  parseLocationJobsSearch,
} from '../lib/jobs-search';
import { saveJob } from '../server/account';
import { createJobsLocationCategoryLoader } from './-jobs-taxonomy-loaders';

import { placeDistanceUnit, shortPlaceName } from '@/board/search-radius';
import { JobsNotFound } from '@/components/board/jobs-not-found';
import { SearchRadiusScope } from '@/components/board/search-radius-scope';
import { jsonLdHeadScripts } from '@/components/json-ld';
import { locationCategoryListingCopy } from '@/copy-groups/location-listing';
import { workArrangementRedirect } from '@/lib/work-arrangement';
import { PROGRAMMATIC_JOBS_PAGE_SIZE } from '@/routes/-programmatic-jobs-constants';
import { ProgrammaticJobsView } from '@/routes/-programmatic-jobs-view';

export const Route = createFileRoute('/jobs/locations/$location/$keyword')({
  staticData: { fullBleed: true, ownsMain: true, fillsViewport: true },
  validateSearch: parseLocationJobsSearch,
  beforeLoad: ({ params, search }) => {
    const target = workArrangementRedirect(
      { location: params.location, category: params.keyword },
      search,
    );
    if (target) throw redirect({ ...target, statusCode: 308 });
  },
  loaderDeps: ({ search }) => jobsListingLoaderDeps(search),
  loader: createJobsLocationCategoryLoader(),
  head: ({ loaderData }) =>
    loaderData
      ? { ...loaderData.head, scripts: jsonLdHeadScripts(loaderData.jsonLd) }
      : {},
  component: LocationCategoryPage,
  notFoundComponent: () => <JobsNotFound />,
});

function LocationCategoryPage() {
  const {
    place,
    category,
    list,
    relatedSearches,
    relatedSearchesPlace,
    searchRadius,
    reachableCount,
  } = Route.useLoaderData();
  const { location, keyword } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { heading, countedHeading } = locationCategoryListingCopy(
    location,
    place,
    category,
  );
  return (
    <ProgrammaticJobsView
      heading={heading}
      countedHeading={countedHeading}
      resultsScope={
        searchRadius
          ? (range) => (
              <SearchRadiusScope
                place={shortPlaceName(place)}
                unit={searchRadius.unit}
                within={searchRadius.selected?.value ?? null}
                defaultWithin={searchRadius.defaultOption.value}
                range={range}
                onWithinChange={(within) =>
                  navigate({
                    search: (prev) => ({
                      ...prev,
                      within,
                      page: undefined,
                      selectedJob: undefined,
                    }),
                  })
                }
              />
            )
          : undefined
      }
      count={list.count}
      gatedCount={list.gatedCount}
      reachableCount={reachableCount}
      jobs={list.data}
      page={search.page ?? 1}
      pageSize={PROGRAMMATIC_JOBS_PAGE_SIZE}
      relatedSearches={relatedSearches}
      relatedSearchesPlace={relatedSearchesPlace}
      filters={search}
      listingRoute={{ location, category: keyword }}
      listedTermSlug={category.sourceSlug}
      onSaveJob={async (jobId) => {
        await saveJob({ data: { jobId } });
      }}
      location={{ slug: location, label: place.displayName }}
      distanceUnit={placeDistanceUnit(place)}
    />
  );
}
