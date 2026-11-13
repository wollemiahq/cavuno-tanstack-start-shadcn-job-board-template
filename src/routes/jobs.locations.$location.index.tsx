/**
 * Programmatic location page — `/jobs/locations/:location` (hosted parity:
 * `boards/[slug]/(main)/jobs/locations/[location]/page.tsx`). Place resolve +
 * list + head run in ONE server fn (404 / 308 like the taxonomy pages); the
 * API filters the listing to that place (`location`), widened to a search
 * distance around a city or locality when the URL carries `within`.
 *
 * Head meta is computed in getJobsLocationPage so `@cavuno/board/seo` stays
 * out of the universal client entry.
 */
import { createFileRoute, redirect } from '@tanstack/react-router';

import {
  jobsListingLoaderDeps,
  parseLocationJobsSearch,
} from '../lib/jobs-search';
import { saveJob } from '../server/account';
import { createJobsLocationLoader } from './-jobs-taxonomy-loaders';

import { placeDistanceUnit, shortPlaceName } from '@/board/search-radius';
import { JobsNotFound } from '@/components/board/jobs-not-found';
import { SearchRadiusScope } from '@/components/board/search-radius-scope';
import { jsonLdHeadScripts } from '@/components/json-ld';
import { locationListingCopy } from '@/copy-groups/location-listing';
import { workArrangementRedirect } from '@/lib/work-arrangement';
import { PROGRAMMATIC_JOBS_PAGE_SIZE } from '@/routes/-programmatic-jobs-constants';
import { ProgrammaticJobsView } from '@/routes/-programmatic-jobs-view';

export const Route = createFileRoute('/jobs/locations/$location/')({
  staticData: { fullBleed: true, ownsMain: true, fillsViewport: true },
  validateSearch: parseLocationJobsSearch,
  // `remote?remoteOption=hybrid` is the hybrid page.
  beforeLoad: ({ params, search }) => {
    const target = workArrangementRedirect(
      { location: params.location },
      search,
    );
    if (target) throw redirect({ ...target, statusCode: 308 });
  },
  loaderDeps: ({ search }) => jobsListingLoaderDeps(search),
  loader: createJobsLocationLoader(),
  head: ({ loaderData }) =>
    loaderData
      ? { ...loaderData.head, scripts: jsonLdHeadScripts(loaderData.jsonLd) }
      : {},
  component: LocationPage,
  notFoundComponent: () => <JobsNotFound />,
});

function LocationPage() {
  const {
    place,
    introHtml,
    list,
    relatedSearches,
    relatedSearchesPlace,
    searchRadius,
    reachableCount,
  } = Route.useLoaderData();
  const { location } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { heading, countedHeading } = locationListingCopy(location, place);
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
      introHtml={introHtml}
      count={list.count}
      gatedCount={list.gatedCount}
      reachableCount={reachableCount}
      jobs={list.data}
      page={search.page ?? 1}
      pageSize={PROGRAMMATIC_JOBS_PAGE_SIZE}
      relatedSearches={relatedSearches}
      relatedSearchesPlace={relatedSearchesPlace}
      filters={search}
      listingRoute={{ location }}
      onSaveJob={async (jobId) => {
        await saveJob({ data: { jobId } });
      }}
      location={{ slug: location, label: place.displayName }}
      distanceUnit={placeDistanceUnit(place)}
    />
  );
}
