/**
 * Programmatic location + skill page — `/jobs/locations/:location/skills/:skill`
 * (hosted parity: `…/jobs/locations/[location]/skills/[skill]/page.tsx`). Both
 * the place and the skill must resolve; the API seeds the search with the
 * skill's source name AND filters to the place's radius.
 */
import { createFileRoute, notFound, redirect } from "@tanstack/react-router";

import { JobsNotFound } from "@/components/board/jobs-not-found";
import {
  ProgrammaticJobsView,
  PROGRAMMATIC_JOBS_PAGE_SIZE,
} from "../components/programmatic-jobs-view";
import { pageToOffset } from "../lib/pagination";
import { jobsListingLoaderDeps, parseJobsSearch } from "../lib/jobs-search";
import { listingHead } from "@cavuno/board/seo";
import { m } from "../paraglide/messages";
import { getSeoBase, listJobs, resolvePlace, resolveSkill } from "../server/queries";

export const Route = createFileRoute("/jobs/locations/$location/skills/$skill")({
  staticData: { fullBleed: true, ownsMain: true },
  validateSearch: parseJobsSearch,
  loaderDeps: ({ search }) => jobsListingLoaderDeps(search),
  loader: async ({ params, deps }) => {
    const [place, skill] = await Promise.all([
      resolvePlace({ data: { slug: params.location } }),
      resolveSkill({ data: { slug: params.skill } }),
    ]);
    if (!place || !skill) throw notFound();
    if (place.redirectTo || skill.redirectTo) {
      throw redirect({
        to: "/jobs/locations/$location/skills/$skill",
        params: {
          location: place.redirectTo ?? params.location,
          skill: skill.redirectTo ?? params.skill,
        },
      });
    }
    const [list, seo] = await Promise.all([
      listJobs({
        data: {
          location: params.location,
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
    return { place, skill, list, seo };
  },
  head: ({ loaderData, params }) =>
    loaderData
      ? listingHead({
          ...loaderData.seo,
          path: `/jobs/locations/${params.location}/skills/${params.skill}`,
          heading: m.locationSkillPage_jobsHeading({
            skill: loaderData.skill.displayName,
            place: loaderData.place.displayName,
          }),
          count: loaderData.list.count,
        })
      : {},
  component: LocationSkillPage,
  notFoundComponent: () => <JobsNotFound />,
});

function LocationSkillPage() {
  const { place, skill, list, seo } = Route.useLoaderData();
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
      relatedSearches={list.relatedSearches}
      origin={seo.origin}
      filters={search}
      location={{ slug: location, label: place.displayName }}
    />
  );
}
