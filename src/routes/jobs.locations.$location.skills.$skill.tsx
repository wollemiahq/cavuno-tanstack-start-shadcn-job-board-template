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
import { createFileRoute } from '@tanstack/react-router';

import {
  jobsListingLoaderDeps,
  parseLocationJobsSearch,
} from '../lib/jobs-search';
import { m } from '../paraglide/messages';
import { saveJob } from '../server/account';
import { createJobsLocationSkillLoader } from './-jobs-taxonomy-loaders';

import { shortPlaceName } from '@/board/search-radius';
import { JobsNotFound } from '@/components/board/jobs-not-found';
import { SearchRadiusScope } from '@/components/board/search-radius-scope';
import { jsonLdHeadScripts } from '@/components/json-ld';
import { PROGRAMMATIC_JOBS_PAGE_SIZE } from '@/routes/-programmatic-jobs-constants';
import { ProgrammaticJobsView } from '@/routes/-programmatic-jobs-view';

export const Route = createFileRoute('/jobs/locations/$location/skills/$skill')(
  {
    staticData: { fullBleed: true, ownsMain: true, fillsViewport: true },
    validateSearch: parseLocationJobsSearch,
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
  const { location } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <ProgrammaticJobsView
      heading={m.locationSkillPage_jobsHeading({
        skill: skill.displayName,
        place: place.displayName,
      })}
      countedHeading={(counted) =>
        m.locationSkillPage_jobsCountHeading({
          ...counted,
          skill: skill.displayName,
          place: place.displayName,
        })
      }
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
      onSaveJob={async (jobId) => {
        await saveJob({ data: { jobId } });
      }}
      location={{ slug: location, label: place.displayName }}
    />
  );
}
