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
import { createFileRoute } from '@tanstack/react-router';

import {
  jobsListingLoaderDeps,
  parseLocationJobsSearch,
} from '../lib/jobs-search';
import { m } from '../paraglide/messages';
import { saveJob } from '../server/account';
import { createJobsLocationLoader } from './-jobs-taxonomy-loaders';

import { JobsNotFound } from '@/components/board/jobs-not-found';
import { SearchRadiusScope } from '@/components/board/search-radius-scope';
import { jsonLdHeadScripts } from '@/components/json-ld';
import { PROGRAMMATIC_JOBS_PAGE_SIZE } from '@/routes/-programmatic-jobs-constants';
import { ProgrammaticJobsView } from '@/routes/-programmatic-jobs-view';

export const Route = createFileRoute('/jobs/locations/$location/')({
  staticData: { fullBleed: true, ownsMain: true, fillsViewport: true },
  validateSearch: parseLocationJobsSearch,
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
  const { place, list, relatedSearches, searchRadius } = Route.useLoaderData();
  const { location } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <ProgrammaticJobsView
      heading={m.locationPage_jobsHeading({ place: place.displayName })}
      resultsScope={
        searchRadius ? (
          <SearchRadiusScope
            place={place.displayName}
            unit={searchRadius.unit}
            within={searchRadius.selected?.value}
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
        ) : undefined
      }
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
