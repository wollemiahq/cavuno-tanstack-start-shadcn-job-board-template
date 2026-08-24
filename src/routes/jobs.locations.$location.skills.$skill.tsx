/**
 * Programmatic location + skill page — `/jobs/locations/:location/skills/:skill`
 * (hosted parity: `…/jobs/locations/[location]/skills/[skill]/page.tsx`). Both
 * the place and the skill must resolve; the API seeds the search with the
 * skill's source name AND filters to the place's radius.
 *
 * Head meta is computed in getJobsLocationSkillPage so `@cavuno/board/seo`
 * stays out of the universal client entry.
 */
import { createFileRoute } from '@tanstack/react-router';

import { jobsListingLoaderDeps, parseJobsSearch } from '../lib/jobs-search';
import { m } from '../paraglide/messages';
import { saveJob } from '../server/account';
import { createJobsLocationSkillLoader } from './-jobs-taxonomy-loaders';

import { JobsNotFound } from '@/components/board/jobs-not-found';
import { jsonLdHeadScripts } from '@/components/json-ld';
import { PROGRAMMATIC_JOBS_PAGE_SIZE } from '@/routes/-programmatic-jobs-constants';
import { ProgrammaticJobsView } from '@/routes/-programmatic-jobs-view';

export const Route = createFileRoute('/jobs/locations/$location/skills/$skill')(
  {
    staticData: { fullBleed: true, ownsMain: true, fillsViewport: true },
    validateSearch: parseJobsSearch,
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
  const { place, skill, list, relatedSearches } = Route.useLoaderData();
  const { location } = Route.useParams();
  const search = Route.useSearch();
  return (
    <ProgrammaticJobsView
      heading={m.locationSkillPage_jobsHeading({
        skill: skill.displayName,
        place: place.displayName,
      })}
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
