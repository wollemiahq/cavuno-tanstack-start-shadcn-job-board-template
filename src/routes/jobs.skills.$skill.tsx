/**
 * Programmatic skill page — `/jobs/skills/:skill` (hosted parity:
 * `boards/[slug]/(main)/jobs/skills/[skill]/page.tsx`). Same shape as the
 * category page: resolve + list + head run in ONE server fn; the API seeds
 * the search with the skill's English source name server-side.
 *
 * Head meta is computed in getJobsSkillPage so `@cavuno/board/seo` stays out
 * of the universal client entry.
 */
import { createFileRoute, notFound, redirect } from '@tanstack/react-router';

import { jobsListingLoaderDeps, parseJobsSearch } from '../lib/jobs-search';
import { pageToOffset } from '../lib/pagination';
import { m } from '../paraglide/messages';
import { saveJob } from '../server/account';
import { getJobsSkillPage } from '../server/jobs-listing-pages';

import { JobsNotFound } from '@/components/board/jobs-not-found';
import { jsonLdHeadScripts } from '@/components/json-ld';
import { PROGRAMMATIC_JOBS_PAGE_SIZE } from '@/routes/-programmatic-jobs-constants';
import { ProgrammaticJobsView } from '@/routes/-programmatic-jobs-view';

export const Route = createFileRoute('/jobs/skills/$skill')({
  staticData: { fullBleed: true, ownsMain: true, fillsViewport: true },
  validateSearch: parseJobsSearch,
  loaderDeps: ({ search }) => jobsListingLoaderDeps(search),
  loader: async ({ params, deps }) => {
    // ONE server fn: skill resolve joins the listing + SEO batch so we do
    // not pay a serial resolve hop before the real page read.
    const result = await getJobsSkillPage({
      data: {
        skillSlug: params.skill,
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
        to: '/jobs/skills/$skill',
        params: { skill: result.to },
        statusCode: 308,
      });
    }
    return result;
  },
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
