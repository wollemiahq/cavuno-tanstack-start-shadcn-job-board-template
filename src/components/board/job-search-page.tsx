"use client";

import { boardCopy } from "#/copy";

import { JobList } from "@/components/board/job-list";
import { JobsResultsBar } from "@/components/board/jobs-results-bar";
import { JobsSearchControls } from "@/components/board/jobs-search-controls";
import { ListingPageHeader } from "@/components/board/listing-page-header";
import { ListingPagination } from "@/components/board/listing-pagination";
import { ListingRail, railHasContent } from "@/components/board/listing-rail";
import { PageBody } from "@/components/board/page-body";
import { relatedSearchesTitle, relatedSearchesToChips } from "@/board/related-searches";
import { m } from "../../paraglide/messages";
/**
 * The jobs browse surface (CAV-485, Lumen structure CAV-497, CAV-502) — a
 * `PageBody` whose full-bleed `band` is the shared `ListingPageHeader`
 * carrying the heading, subtitle, and the search panel, then the
 * constrained results section: the "Showing X–Y of Z" results bar, the
 * Lumen-style listing rows, and the page-based pagination nav (CAV-496).
 * The route must set `staticData.fullBleed`.
 *
 * Pure assembly + thin view-model binding: data and pagination state come
 * from your loader, edits go out through callbacks. Featured jobs are no
 * longer pulled into a bespoke hero card — they earn the brand ring/pill
 * inside the same `JobCard` system, in the grid (no fake-featuring the
 * first row when nothing is truly featured).
 */
import type { BreadcrumbData } from "@/components/board/breadcrumb";
import type { PublicJobCard, RelatedSearch } from "@cavuno/board";
import type { ListingFilters } from "@cavuno/board/filters";
import type { BoardLabelOverrides } from "@cavuno/board/format";

export function JobSearchPage({
    jobs,
    count,
    page,
    pageSize,
    filters,
    language,
    labels,
    heading,
    breadcrumb,
    relatedSearches,
    adSlot,
    onFiltersChange,
    onPageChange,
    locationSlot,
}: {
    jobs: PublicJobCard[];
    /** Total result count when the API returned one. */
    count?: number;
    /** The current 1-based page. */
    page: number;
    /** Items per page — the loader `limit` for this surface. */
    pageSize: number;
    filters: ListingFilters;
    /** Board language (ISO code) from `board.context()`. */
    language: string;
    /** Operator label overrides (`board.context().labels`), ADR-0059. */
    labels?: BoardLabelOverrides;
    heading?: string;
    /** Resolved trail for the header band (pairs with the route's BreadcrumbList JSON-LD). */
    breadcrumb?: BreadcrumbData;
    /** Browse-list related searches (category/skill) → the rail card. Absent on text search. */
    relatedSearches?: RelatedSearch[];
    /** Optional operator ad unit for the listing rail (renders nothing when absent). */
    adSlot?: React.ReactNode;
    onFiltersChange: (next: ListingFilters) => void;
    /** Navigate to a 1-based page (the route rewrites the `?page=` URL). */
    onPageChange: (page: number) => void;
    /** Optional location autocomplete (see jobs-search-controls). */
    locationSlot?: React.ReactNode;
}) {
    const copy = boardCopy(language, labels);

    // The browse envelope carries category/skill related searches; text search
    // does not — the rail shows the card only when they exist (CAV-511).
    const relatedChips = relatedSearchesToChips(relatedSearches);
    const rail = railHasContent(adSlot, relatedChips) ? (
        <ListingRail
            adSlot={adSlot}
            relatedTitle={relatedSearchesTitle(labels)}
            relatedChips={relatedChips}
        />
    ) : undefined;

    return (
        <PageBody
            band={
                <ListingPageHeader
                    breadcrumb={breadcrumb}
                    title={heading ?? copy.jobSearch.headingJobs}
                    subtitle={m.jobsHero_subtitle()}
                    search={
                        <JobsSearchControls
                            filters={filters}
                            language={language}
                            labels={labels}
                            onChange={onFiltersChange}
                            locationSlot={locationSlot}
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
                language={language}
                labels={labels}
                onSortChange={(sort) => onFiltersChange({ ...filters, sort })}
            />

            <JobList jobs={jobs} language={language} labels={labels} variant="rows" />

            <ListingPagination page={page} count={count ?? 0} pageSize={pageSize} onPageChange={onPageChange} />
        </PageBody>
    );
}
