/**
 * Programmatic skill page — `/jobs/skills/:skill` (hosted parity:
 * `boards/[slug]/(main)/jobs/skills/[skill]/page.tsx`). Same shape as the
 * category page: resolve + list + head run in ONE server fn; the API seeds
 * the search with the skill's English source name server-side.
 *
 * Head meta is computed in getJobsSkillPage so `@cavuno/board/seo` stays out
 * of the universal client entry.
 */
import { createFileRoute } from '@tanstack/react-router';

import { jobsListingLoaderDeps, parseJobsSearch } from '../lib/jobs-search';
import { m } from '../paraglide/messages';
import { saveJob } from '../server/account';
import { createJobsSkillLoader } from './-jobs-taxonomy-loaders';

import { JobsNotFound } from '@/components/board/jobs-not-found';
import { jsonLdHeadScripts } from '@/components/json-ld';
import { PROGRAMMATIC_JOBS_PAGE_SIZE } from '@/routes/-programmatic-jobs-constants';
import { ProgrammaticJobsView } from '@/routes/-programmatic-jobs-view';

export const Route = createFileRoute('/jobs/skills/$skill')({
  staticData: { fullBleed: true, ownsMain: true, fillsViewport: true },
  validateSearch: parseJobsSearch,
  loaderDeps: ({ search }) => jobsListingLoaderDeps(search),
  loader: createJobsSkillLoader(),
  head: ({ loaderData }) =>
    loaderData
      ? { ...loaderData.head, scripts: jsonLdHeadScripts(loaderData.jsonLd) }
      : {},
  component: SkillPage,
  notFoundComponent: () => <JobsNotFound />,
});

function SkillPage() {
  const { skill, list, relatedSearches } = Route.useLoaderData();
  const search = Route.useSearch();
  return (
    <ProgrammaticJobsView
      heading={m.skillPage_jobsHeading({ skill: skill.displayName })}
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
    />
  );
}
