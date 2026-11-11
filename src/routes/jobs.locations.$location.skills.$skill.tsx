/**
 * Programmatic location + skill page — `/jobs/locations/:location/skills/:skill`
 * (hosted parity: `…/jobs/locations/[location]/skills/[skill]/page.tsx`). Both
 * the place and the skill must resolve; the API seeds the search with the
 * skill's source name AND filters to the place, widened to a search distance
 * around a city or locality when the URL carries `within`.
 *
 * Head meta is computed in getJobsLocationSkillPage so `@cavuno/board/seo`
 * stays out of the universal client entry.
 */
import { createFileRoute, redirect } from '@tanstack/react-router';

import {
  jobsListingLoaderDeps,
  parseLocationJobsSearch,
} from '../lib/jobs-search';
import { saveJob } from '../server/account';
import { createJobsLocationSkillLoader } from './-jobs-taxonomy-loaders';

import { placeDistanceUnit, shortPlaceName } from '@/board/search-radius';
import { JobsNotFound } from '@/components/board/jobs-not-found';
import { SearchRadiusScope } from '@/components/board/search-radius-scope';
import { jsonLdHeadScripts } from '@/components/json-ld';
import { locationSkillListingCopy } from '@/copy-groups/location-listing';
import { workArrangementRedirect } from '@/lib/work-arrangement';
import { PROGRAMMATIC_JOBS_PAGE_SIZE } from '@/routes/-programmatic-jobs-constants';
import { ProgrammaticJobsView } from '@/routes/-programmatic-jobs-view';

export const Route = createFileRoute('/jobs/locations/$location/skills/$skill')(
  {
    staticData: { fullBleed: true, ownsMain: true, fillsViewport: true },
    validateSearch: parseLocationJobsSearch,
    beforeLoad: ({ params, search }) => {
      const target = workArrangementRedirect(
        { location: params.location, skill: params.skill },
        search,
      );
      if (target) throw redirect({ ...target, statusCode: 308 });
    },
    loaderDeps: ({ search }) => jobsListingLoaderDeps(search),
    loader: createJobsLocationSkillLoader(),
    head: ({ loaderData }) =>
      loaderData
        ? { ...loaderData.head, scripts: jsonLdHeadScripts(loaderData.jsonLd) }
        : {},
    component: LocationSkillPage,
    notFoundComponent: () => <JobsNotFound />,
  },
);

function LocationSkillPage() {
  const { place, skill, list, relatedSearches, searchRadius, reachableCount } =
    Route.useLoaderData();
  const { location, skill: skillSlug } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { heading, countedHeading } = locationSkillListingCopy(
    location,
    place,
    skill,
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
      filters={search}
      listingRoute={{ location, skill: skillSlug }}
      listedTermSlug={skill.sourceSlug}
      onSaveJob={async (jobId) => {
        await saveJob({ data: { jobId } });
      }}
      location={{ slug: location, label: place.displayName }}
      distanceUnit={placeDistanceUnit(place)}
    />
  );
}
