"use client";

import { Search } from "lucide-react";

import type { PublicJobCard, RelatedSearch } from "@cavuno/board";
import type { ListingFilters } from "@cavuno/board/filters";
import type { BoardLabelOverrides } from "@cavuno/board/format";

import { boardCopy } from "#/copy";
import { relatedSearchesTitle, relatedSearchesToChips } from "@/board/related-searches";
import { toJobCardVM } from "@/board/job-view-model";
import { PageBreadcrumb, type BreadcrumbData } from "@/components/board/breadcrumb";
import { JobSearchResult } from "@/components/board/job-search-result";
import { JobsResultsBar } from "@/components/board/jobs-results-bar";
import { JobsSearchControls } from "@/components/board/jobs-search-controls";
import { ListingPagination } from "@/components/board/listing-pagination";
import type { LocationSuggestionState } from "@/components/location-combobox";
import { Box } from "@/components/layout/box";
import { Container } from "@/components/layout/container";
import { Page, PageHeader } from "@/components/layout/page";
import {
  AdRail,
  SearchResultDetail,
  SearchResultsLayout,
  SearchResultsList,
} from "@/components/search-results/search-results";
import { badgeVariants } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { useSearchSelection } from "@/hooks/use-search-selection";
import { m } from "../../paraglide/messages";

type AdPlacement = {
  label: string;
  content: React.ReactNode;
};

function JobsEmpty({ filters }: { filters: ListingFilters }) {
  const hasFilters = Boolean(
    filters.remoteOption || filters.employmentType || filters.seniority?.length,
  );
  const description = hasFilters
    ? m.jobSearch_filteredEmptyText()
    : filters.q
      ? m.jobSearch_queryEmptyText()
      : m.jobSearch_initialEmptyText();

  return (
    <Empty className="min-h-72 border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Search aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>{m.jobSearch_headingJobs()}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

export function JobSearchPage({
  jobs,
  count,
  gatedCount,
  page,
  pageSize,
  filters,
  language,
  labels,
  heading,
  breadcrumb,
  relatedSearches,
  onFiltersChange,
  onSearchSubmit,
  onPageChange,
  location,
  locationSuggestions,
  selectedJob,
  onSelectedJobReplace,
  onSelectedJobPush,
  detail,
  startAd,
  endAd,
}: {
  jobs: PublicJobCard[];
  count?: number;
  /** Honest count of paywalled results withheld from this viewer. */
  gatedCount?: number;
  page: number;
  pageSize: number;
  filters: ListingFilters;
  language: string;
  labels?: BoardLabelOverrides;
  heading?: string;
  breadcrumb?: BreadcrumbData;
  relatedSearches?: RelatedSearch[];
  onFiltersChange: (next: ListingFilters) => void;
  onSearchSubmit: (next: ListingFilters, location: { slug: string; name: string } | null) => void;
  onPageChange: (page: number) => void;
  location?: { slug: string; label: string };
  locationSuggestions: LocationSuggestionState;
  selectedJob?: string;
  onSelectedJobReplace: (jobSlug: string) => void;
  onSelectedJobPush: (jobSlug: string) => void;
  detail: React.ReactNode;
  startAd?: AdPlacement;
  endAd?: AdPlacement;
}) {
  const copy = boardCopy(language, labels);
  const jobVms = jobs.map((job) => toJobCardVM(job, language, labels));
  const selectableSlugs = jobVms.flatMap((vm) => (vm.jobSlug && vm.detailHref ? [vm.jobSlug] : []));
  const selection = useSearchSelection({
    selectedId: selectedJob,
    resultIds: selectableSlugs,
    onReplace: onSelectedJobReplace,
    onPush: onSelectedJobPush,
  });
  const relatedChips = relatedSearchesToChips(relatedSearches);

  return (
    <Page width="wide">
      <main data-layout="job-search-page">
        <Box background="muted" border="bottom">
          {breadcrumb ? (
            <PageBreadcrumb items={breadcrumb.items} ariaLabel={breadcrumb.ariaLabel} />
          ) : null}
          <Container width="wide">
            <PageHeader
              align="center"
              title={heading ?? copy.jobSearch.headingJobs}
              description={m.jobsHero_subtitle()}
            >
              <div className="mt-2 w-full max-w-5xl text-left">
                <JobsSearchControls
                  filters={filters}
                  language={language}
                  labels={labels}
                  onChange={onFiltersChange}
                  onSearchSubmit={onSearchSubmit}
                  location={location}
                  locationSuggestions={locationSuggestions}
                />
              </div>
            </PageHeader>
          </Container>
        </Box>

        <Box paddingX={{ base: "4", md: "8" }} paddingY={{ base: "6", md: "8" }}>
          <SearchResultsLayout
            startAd={startAd ? <AdRail label={startAd.label}>{startAd.content}</AdRail> : undefined}
            endAd={endAd ? <AdRail label={endAd.label}>{endAd.content}</AdRail> : undefined}
            list={
              <SearchResultsList
                label={m.jobSearch_resultsRegionLabel()}
                scrollRestorationId="jobs-search-results"
              >
                <div className="space-y-4 p-4">
                  <JobsResultsBar
                    count={count}
                    page={page}
                    pageSize={pageSize}
                    sort={filters.sort}
                    language={language}
                    labels={labels}
                    onSortChange={(sort) => onFiltersChange({ ...filters, sort })}
                  />

                  {jobVms.length > 0 ? (
                    <div className="space-y-3">
                      {jobVms.map((vm) => (
                        <JobSearchResult
                          key={vm.id}
                          vm={vm}
                          selected={vm.jobSlug === selection.selectedId}
                          onActivate={
                            vm.jobSlug
                              ? (event) => selection.onResultActivate(event, vm.jobSlug!)
                              : undefined
                          }
                        />
                      ))}
                    </div>
                  ) : (
                    <JobsEmpty filters={filters} />
                  )}

                  {gatedCount && gatedCount > 0 ? (
                    <aside
                      aria-label={m.jobSearch_unlockMoreLabel()}
                      className="flex flex-col items-start gap-3 rounded-2xl border border-border bg-muted p-4"
                    >
                      <p className="text-sm text-muted-foreground">
                        {m.jobSearch_gatedCountText({
                          count: gatedCount.toLocaleString(language),
                        })}
                      </p>
                      <a href="/account/access" className={buttonVariants({ size: "sm" })}>
                        {m.jobSearch_unlockMoreLabel()}
                      </a>
                    </aside>
                  ) : null}

                  <ListingPagination
                    page={page}
                    count={count ?? 0}
                    pageSize={pageSize}
                    onPageChange={onPageChange}
                  />

                  {relatedChips.length > 0 ? (
                    <section
                      aria-label={relatedSearchesTitle(labels)}
                      className="space-y-3 border-t border-border pt-4"
                    >
                      <h2 className="text-sm font-semibold">{relatedSearchesTitle(labels)}</h2>
                      <div className="flex flex-wrap gap-1.5">
                        {relatedChips.map((chip) => (
                          <a
                            key={chip.key}
                            href={chip.href}
                            className={badgeVariants({ variant: "outline" })}
                          >
                            {chip.name}
                          </a>
                        ))}
                      </div>
                    </section>
                  ) : null}
                </div>
              </SearchResultsList>
            }
            detail={
              <SearchResultDetail
                ref={selection.detailRef}
                label={m.jobSearch_selectedJobRegionLabel()}
                scrollRestorationId="jobs-selected-detail"
              >
                {detail}
              </SearchResultDetail>
            }
          />
        </Box>
      </main>
    </Page>
  );
}
