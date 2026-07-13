/**
 * Programmatic location page — `/jobs/locations/:location` (hosted parity:
 * `boards/[slug]/(main)/jobs/locations/[location]/page.tsx`). Resolve the place
 * slug (404 / 308 like the taxonomy pages), then the API filters the listing to
 * a geo radius around that place (`location` param).
 */
import { createFileRoute, notFound, redirect } from "@tanstack/react-router";

import { parseListingFilters } from "@cavuno/board/filters";

import { JobsNotFound } from "@/components/board/jobs-not-found";
import { ProgrammaticJobsView, PROGRAMMATIC_JOBS_PAGE_SIZE } from "../components/programmatic-jobs-view";
import { pageSearchValue, pageToOffset, parsePageParam } from "../lib/pagination";
import { listingHead } from "@cavuno/board/seo";
import { m } from "../paraglide/messages";
import { getSeoBase, listJobs, resolvePlace, searchJobs } from "../server/queries";
import { useLocationSuggestions } from "./-use-location-suggestions";

export const Route = createFileRoute("/jobs/locations/$location/")({
  staticData: { fullBleed: true },
  validateSearch: (
    search: Record<string, unknown>,
  ): ReturnType<typeof parseListingFilters> & { page?: number } => ({
    ...parseListingFilters(search),
    page: pageSearchValue(parsePageParam(search.page)),
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ params, deps }) => {
    const place = await resolvePlace({ data: { slug: params.location } });
    if (!place) throw notFound();
    if (place.redirectTo) {
      throw redirect({
        to: "/jobs/locations/$location",
        params: { location: place.redirectTo },
      });
    }
    const [list, seo] = await Promise.all([
      deps.q
        ? searchJobs({
            data: {
              query: deps.q,
              filters: {
                location: params.location,
                remoteOption: deps.remoteOption ? [deps.remoteOption] : undefined,
                employmentType: deps.employmentType ? [deps.employmentType] : undefined,
                seniority: deps.seniority?.length ? deps.seniority : undefined,
              },
              sort: deps.sort,
              offset: pageToOffset(deps.page ?? 1, PROGRAMMATIC_JOBS_PAGE_SIZE),
              limit: PROGRAMMATIC_JOBS_PAGE_SIZE,
            },
          })
        : listJobs({
            data: {
              location: params.location,
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
    return { place, list, seo };
  },
  head: ({ loaderData, params }) =>
    loaderData
      ? listingHead({
          ...loaderData.seo,
          path: `/jobs/locations/${params.location}`,
          heading: m.locationPage_jobsHeading({
            place: loaderData.place.displayName,
          }),
          count: loaderData.list.count,
        })
      : {},
  component: LocationPage,
  notFoundComponent: () => <JobsNotFound message={m.locationPage_notFoundText()} />,
});

function LocationPage() {
  const { place, list, seo } = Route.useLoaderData();
  const { location } = Route.useParams();
  const search = Route.useSearch();
  const locationSuggestions = useLocationSuggestions(seo.language);
  return (
    <ProgrammaticJobsView
      heading={m.locationPage_jobsHeading({ place: place.displayName })}
      count={list.count}
      jobs={list.data}
      page={search.page ?? 1}
      pageSize={PROGRAMMATIC_JOBS_PAGE_SIZE}
      relatedSearches={
        "relatedSearches" in list ? list.relatedSearches : undefined
      }
      origin={seo.origin}
      filters={search}
      locationSuggestions={locationSuggestions}
      location={{ slug: location, label: place.displayName }}
    />
  );
}
