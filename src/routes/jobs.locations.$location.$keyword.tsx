/**
 * Programmatic location + category page — `/jobs/locations/:location/:keyword`
 * (hosted parity: `…/jobs/locations/[location]/[keyword]/page.tsx`). Both the
 * place and the category must resolve; the API seeds the search with the
 * category's source name AND filters to the place's radius.
 */
import { createFileRoute, notFound, redirect } from "@tanstack/react-router";

import { parseListingFilters } from "@cavuno/board/filters";

import { JobsNotFound } from "@/components/board/jobs-not-found";
import { ProgrammaticJobsView, PROGRAMMATIC_JOBS_PAGE_SIZE } from "../components/programmatic-jobs-view";
import { pageSearchValue, pageToOffset, parsePageParam } from "../lib/pagination";
import { listingHead } from "@cavuno/board/seo";
import { m } from "../paraglide/messages";
import { getSeoBase, listJobs, resolveCategory, resolvePlace } from "../server/queries";
import { useLocationSuggestions } from "./-use-location-suggestions";

export const Route = createFileRoute("/jobs/locations/$location/$keyword")({
  staticData: { fullBleed: true },
  validateSearch: (
    search: Record<string, unknown>,
  ): ReturnType<typeof parseListingFilters> & { page?: number } => ({
    ...parseListingFilters(search),
    page: pageSearchValue(parsePageParam(search.page)),
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ params, deps }) => {
    const [place, category] = await Promise.all([
      resolvePlace({ data: { slug: params.location } }),
      resolveCategory({ data: { slug: params.keyword } }),
    ]);
    if (!place || !category) throw notFound();
    if (place.redirectTo || category.redirectTo) {
      throw redirect({
        to: "/jobs/locations/$location/$keyword",
        params: {
          location: place.redirectTo ?? params.location,
          keyword: category.redirectTo ?? params.keyword,
        },
      });
    }
    const [list, seo] = await Promise.all([
      listJobs({
        data: {
          location: params.location,
          category: params.keyword,
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
    return { place, category, list, seo };
  },
  head: ({ loaderData, params }) =>
    loaderData
      ? listingHead({
          ...loaderData.seo,
          path: `/jobs/locations/${params.location}/${params.keyword}`,
          heading: m.locationCategoryPage_jobsHeading({
            category: loaderData.category.displayName,
            place: loaderData.place.displayName,
          }),
          count: loaderData.list.count,
        })
      : {},
  component: LocationCategoryPage,
  notFoundComponent: () => <JobsNotFound message={m.notFound_pageNotFound()} />,
});

function LocationCategoryPage() {
  const { place, category, list, seo } = Route.useLoaderData();
  const { location } = Route.useParams();
  const search = Route.useSearch();
  const locationSuggestions = useLocationSuggestions(seo.language);
  return (
    <ProgrammaticJobsView
      heading={m.locationCategoryPage_jobsHeading({
        category: category.displayName,
        place: place.displayName,
      })}
      count={list.count}
      jobs={list.data}
      page={search.page ?? 1}
      pageSize={PROGRAMMATIC_JOBS_PAGE_SIZE}
      relatedSearches={list.relatedSearches}
      origin={seo.origin}
      filters={search}
      locationSuggestions={locationSuggestions}
      location={{ slug: location, label: place.displayName }}
    />
  );
}
