import { jobsSkillPath } from '@cavuno/board/paths';
import { listingHead } from '@cavuno/board/seo';
/**
 * Programmatic skill page — `/jobs/skills/:skill` (hosted parity:
 * `boards/[slug]/(main)/jobs/skills/[skill]/page.tsx`). Same shape as the
 * category page, resolving the slug as a *skill*; the API seeds the search with
 * the skill's English source name server-side.
 */
import { createFileRoute, notFound, redirect } from '@tanstack/react-router';

import { jobsListingLoaderDeps, parseJobsSearch } from '../lib/jobs-search';
import { pageToOffset } from '../lib/pagination';
import { m } from '../paraglide/messages';
import { saveJob } from '../server/account';
import {
  filterRelatedSearches,
  getSeoBase,
  listJobs,
  resolveSkill,
} from '../server/queries';

import { JobsNotFound } from '@/components/board/jobs-not-found';
import { resolveCardTaxonomy } from '@/lib/resolve-card-taxonomy';
import {
  ProgrammaticJobsView,
  PROGRAMMATIC_JOBS_PAGE_SIZE,
} from '@/routes/-programmatic-jobs-view';

export const Route = createFileRoute('/jobs/skills/$skill')({
  staticData: { fullBleed: true, ownsMain: true, fillsViewport: true },
  validateSearch: parseJobsSearch,
  loaderDeps: ({ search }) => jobsListingLoaderDeps(search),
  loader: async ({ params, deps }) => {
    const skill = await resolveSkill({ data: { slug: params.skill } });
    if (!skill) throw notFound();
    if (skill.redirectTo) {
      throw redirect({
        to: '/jobs/skills/$skill',
        params: { skill: skill.redirectTo },
        statusCode: 308,
      });
    }
    const [list, seo] = await Promise.all([
      listJobs({
        data: {
          skill: params.skill,
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
    const relatedSearches = list.relatedSearches?.length
      ? await filterRelatedSearches({ data: { related: list.relatedSearches } })
      : list.relatedSearches;
    const resolvableTaxonomy = await resolveCardTaxonomy(list.data);
    return { skill, list, seo, relatedSearches, resolvableTaxonomy };
  },
  head: ({ loaderData, params }) =>
    loaderData
      ? listingHead({
          ...loaderData.seo,
          path: jobsSkillPath(params.skill),
          heading: m.skillPage_jobsHeading({
            skill: loaderData.skill.displayName,
          }),
          count: loaderData.list.count,
        })
      : {},
  component: SkillPage,
  notFoundComponent: () => <JobsNotFound />,
});

function SkillPage() {
  const { skill, list, seo, relatedSearches, resolvableTaxonomy } =
    Route.useLoaderData();
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
      resolvableTaxonomy={resolvableTaxonomy}
      origin={seo.origin}
      filters={search}
      onSaveJob={async (jobId) => {
        await saveJob({ data: { jobId } });
      }}
    />
  );
}
