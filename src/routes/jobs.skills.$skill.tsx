/**
 * Programmatic skill page — `/jobs/skills/:skill` (hosted parity:
 * `boards/[slug]/(main)/jobs/skills/[skill]/page.tsx`). Same shape as the
 * category page, resolving the slug as a *skill*; the API seeds the search with
 * the skill's English source name server-side.
 */
import { createFileRoute, notFound, redirect } from "@tanstack/react-router";

import { jobsSkillPath } from "@cavuno/board/paths";

import { JobsNotFound } from "@/components/board/jobs-not-found";
import {
  ProgrammaticJobsView,
  PROGRAMMATIC_JOBS_PAGE_SIZE,
} from "../components/programmatic-jobs-view";
import { pageToOffset } from "../lib/pagination";
import { jobsListingLoaderDeps, parseJobsSearch } from "../lib/jobs-search";
import { listingHead } from "@cavuno/board/seo";
import { m } from "../paraglide/messages";
import { getSeoBase, listJobs, resolveSkill } from "../server/queries";

export const Route = createFileRoute("/jobs/skills/$skill")({
  staticData: { fullBleed: true, ownsMain: true },
  validateSearch: parseJobsSearch,
  loaderDeps: ({ search }) => jobsListingLoaderDeps(search),
  loader: async ({ params, deps }) => {
    const skill = await resolveSkill({ data: { slug: params.skill } });
    if (!skill) throw notFound();
    if (skill.redirectTo) {
      throw redirect({
        to: "/jobs/skills/$skill",
        params: { skill: skill.redirectTo },
      });
    }
    const [list, seo] = await Promise.all([
      listJobs({
        data: {
          skill: params.skill,
          remoteOption: deps.remoteOption ? [deps.remoteOption] : undefined,
          employmentType: deps.employmentType ? [deps.employmentType] : undefined,
          seniority: deps.seniority?.length ? deps.seniority : undefined,
          sort: deps.sort,
          offset: pageToOffset(deps.page ?? 1, PROGRAMMATIC_JOBS_PAGE_SIZE),
          limit: PROGRAMMATIC_JOBS_PAGE_SIZE,
        },
      }),
      getSeoBase(),
    ]);
    return { skill, list, seo };
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
  const { skill, list, seo } = Route.useLoaderData();
  const search = Route.useSearch();
  return (
    <ProgrammaticJobsView
      heading={m.skillPage_jobsHeading({ skill: skill.displayName })}
      count={list.count}
      gatedCount={list.gatedCount}
      jobs={list.data}
      page={search.page ?? 1}
      pageSize={PROGRAMMATIC_JOBS_PAGE_SIZE}
      relatedSearches={list.relatedSearches}
      origin={seo.origin}
      filters={search}
    />
  );
}
