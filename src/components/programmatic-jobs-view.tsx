/**
 * Shared render for the programmatic jobs pages (/jobs/[keyword],
 * /jobs/skills/[skill], /jobs/locations/[location], …) — recomposed as an
 * Untitled UI page (CAV-488) on the same CAV-485 system the browse surface
 * uses: an UUI page header (honest total-count Badge eyebrow + display
 * heading), the filter controls, the shared `JobList` card grid (with its
 * own `EmptyState`), and the server-computed related searches as real link
 * pills. Dumb, typed-props — data arrives from the route loader; SEO/head
 * live in the route.
 */
import { getRouteApi, useNavigate } from "@tanstack/react-router";

import type { PublicJobCard, RelatedSearch } from "@cavuno/board";
import { boardCopy } from "#/copy";
import type { ListingFilters } from "@cavuno/board/filters";

import { JobList } from "@/components/board/job-list";
import { JobsResultsBar } from "@/components/board/jobs-results-bar";
import { JobsSearchControls } from "@/components/board/jobs-search-controls";
import { ListingPageHeader } from "@/components/board/listing-page-header";
import { ListingPagination } from "@/components/board/listing-pagination";
import { ListingRail, railHasContent } from "@/components/board/listing-rail";
import { PageBody } from "@/components/board/page-body";
import { relatedSearchesTitle, relatedSearchesToChips } from "@/board/related-searches";
import { pageSearchValue } from "../lib/pagination";
import { JobAlertFloatingPrompt } from "./job-alert-floating-prompt";
import { JsonLd } from "./json-ld";
import {
  LocationCombobox,
  type LocationSuggestionState,
} from "./location-combobox";
import { jobAlertDefaultsFromSearch } from "../lib/job-alert-defaults";
import { listingJsonLd } from "@cavuno/board/seo";

const rootApi = getRouteApi("__root__");

/** Items per page across every programmatic jobs listing (shared by the routes' loaders). */
export const PROGRAMMATIC_JOBS_PAGE_SIZE = 20;

/**
 * This view renders on every programmatic listing route, so it can't be
 * typed to a single `from`. The typed router would infer the root route's
 * (empty) search and reject the writes; cast to a permissive navigate that
 * writes arbitrary URL search — the values themselves are constrained by
 * `ListingFilters`.
 */
type LooseNavigate = (opts: {
  to?: string;
  params?: Record<string, string>;
  search?: (prev: Record<string, unknown>) => Record<string, unknown>;
}) => void;

export function ProgrammaticJobsView({
  heading,
  count,
  jobs,
  page,
  pageSize,
  relatedSearches,
  origin,
  filters,
  location,
  locationSuggestions,
  adSlot,
}: {
  heading: string;
  count?: number;
  jobs: PublicJobCard[];
  /** The current 1-based page. */
  page: number;
  /** Items per page — the loader `limit` for this surface. */
  pageSize: number;
  relatedSearches?: RelatedSearch[];
  /** Request origin (from `getSeoBase`) → BreadcrumbList + ItemList JSON-LD. */
  origin?: string;
  /** Active cross-cutting filters (the search sidebar's advanced filters). */
  filters: ListingFilters;
  /** Active location (on a `/jobs/locations/:location` page) for the field. */
  location?: { slug: string; label: string };
  /** Route-owned autocomplete results for the location field. */
  locationSuggestions: LocationSuggestionState;
  /** Optional operator ad unit for the listing rail (renders nothing when absent). */
  adSlot?: React.ReactNode;
}) {
  const { board } = rootApi.useLoaderData();
  const copy = boardCopy(board.language, board.labels);
  const navigate = useNavigate() as unknown as LooseNavigate;
  const jsonLd = origin
    ? listingJsonLd({
        origin,
        breadcrumbs: [{ name: copy.breadcrumbs.jobs, path: "/" }, { name: heading }],
        jobs,
      })
    : null;

  // Related searches move from the page bottom into the sticky rail (CAV-511).
  const relatedChips = relatedSearchesToChips(relatedSearches);
  const rail = railHasContent(adSlot, relatedChips) ? (
    <ListingRail
      adSlot={adSlot}
      relatedTitle={relatedSearchesTitle(board.labels)}
      relatedChips={relatedChips}
    />
  ) : undefined;

  return (
    <>
      {jsonLd ? <JsonLd data={jsonLd} /> : null}

      <PageBody
        band={
          <ListingPageHeader
            breadcrumb={
              // Paired with the listingJsonLd BreadcrumbList above — both gated
              // on `origin`, both Jobs (→ /) › heading, current crumb unlinked.
              jsonLd
                ? {
                    ariaLabel: copy.jobDetail.breadcrumbAriaLabel,
                    items: [{ name: copy.breadcrumbs.jobs, href: "/" }, { name: heading }],
                  }
                : undefined
            }
            title={heading}
            search={
              <JobsSearchControls
                filters={filters}
                language={board.language}
                labels={board.labels}
                onChange={(next) =>
                  navigate({
                    search: (prev) => ({ ...prev, ...next, page: undefined }),
                  })
                }
                locationSlot={
                  <LocationCombobox
                    {...locationSuggestions}
                    value={location?.slug}
                    valueLabel={location?.label}
                    onSelect={({ slug }) =>
                      navigate({
                        to: "/jobs/locations/$location",
                        params: { location: slug },
                      })
                    }
                    onClear={() => {
                      if (location) navigate({ to: "/" });
                    }}
                  />
                }
              />
            }
          />
        }
        rail={rail}
      >
      <JobsResultsBar
        count={count}
        page={page}
        pageSize={pageSize}
        sort={filters.sort}
        language={board.language}
        labels={board.labels}
        onSortChange={(sort) => navigate({ search: (prev) => ({ ...prev, sort, page: undefined }) })}
      />

      <JobList jobs={jobs} language={board.language} labels={board.labels} variant="rows" />

      <ListingPagination
        page={page}
        count={count ?? 0}
        pageSize={pageSize}
        onPageChange={(next) =>
          navigate({ search: (prev) => ({ ...prev, page: pageSearchValue(next) }) })
        }
      />
      </PageBody>

      {board.features.jobAlerts ? (
        <JobAlertFloatingPrompt
          language={board.language}
          labels={board.labels}
          defaults={jobAlertDefaultsFromSearch({
            // Location pages scope by place; the category/skill seed isn't
            // cleanly available here so those alerts are board-wide (best-effort).
            keyword: filters.q,
            locationSlug: location?.slug,
            source: "jobs_list",
          })}
        />
      ) : null}
    </>
  );
}
