"use client";

import { Link } from "@tanstack/react-router";
import { Search } from "lucide-react";

import type { PublicJobCard, RelatedSearch } from "@cavuno/board";
import type { ListingFilters } from "@cavuno/board/filters";
import type { BoardLabelOverrides } from "@cavuno/board/format";

import { relatedSearchesTitle, relatedSearchesToChips } from "@/board/related-searches";
import { toJobCardVM } from "@/board/job-view-model";
import { JobSearchResult } from "@/components/board/job-search-result";
import { JobsFilterControls } from "@/components/board/jobs-filter-controls";
import { JobsResultsBar } from "@/components/board/jobs-results-bar";
import { ListingPagination } from "@/components/board/listing-pagination";
import { Box } from "@/components/layout/box";
import { Container } from "@/components/layout/container";
import { Page } from "@/components/layout/page";
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
  EmptyContent,
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
  const noMatch = hasFilters || Boolean(filters.q);

  return (
    <Empty className="min-h-[calc(100dvh-16rem)] border-0">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Search aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>
          {noMatch ? m.jobSearch_noMatchingResultsHeading() : m.jobSearch_headingJobs()}
        </EmptyTitle>
        <EmptyDescription>
          {noMatch ? m.jobSearch_queryEmptyText() : m.jobSearch_initialEmptyText()}
        </EmptyDescription>
      </EmptyHeader>
      {noMatch ? (
        <EmptyContent>
          <Link to="/jobs" className={buttonVariants()}>
            {m.jobSearch_resetFiltersAction()}
          </Link>
        </EmptyContent>
      ) : null}
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
  relatedSearches,
  onFiltersChange,
  onPageChange,
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
  relatedSearches?: RelatedSearch[];
  onFiltersChange: (next: ListingFilters) => void;
  onPageChange: (page: number) => void;
  selectedJob?: string;
  onSelectedJobReplace: (jobSlug: string) => void;
  onSelectedJobPush: (jobSlug: string) => void;
  detail: React.ReactNode;
  startAd?: AdPlacement;
  endAd?: AdPlacement;
}) {
  const jobVms = jobs.map((job) => toJobCardVM(job, language, labels));
  const selectableSlugs = jobVms.flatMap((vm) => (vm.jobSlug && vm.detailHref ? [vm.jobSlug] : []));
  const selection = useSearchSelection({
    selectedId: selectedJob,
    resultIds: selectableSlugs,
    onReplace: onSelectedJobReplace,
    onPush: onSelectedJobPush,
  });
  const relatedChips = relatedSearchesToChips(relatedSearches);
  const resultsBar = (
    <JobsResultsBar
      count={count}
      page={page}
      pageSize={pageSize}
      heading={heading}
      sort={filters.sort}
      language={language}
      labels={labels}
      onSortChange={(sort) => onFiltersChange({ ...filters, sort })}
    />
  );

  return (
    <Page width="wide">
      <main data-layout="job-search-page">
        <Box border="bottom" paddingX={{ base: "4", md: "8" }}>
          <Container width="wide">
            <div className="py-3">
              <JobsFilterControls
                filters={filters}
                language={language}
                labels={labels}
                onChange={onFiltersChange}
              />
            </div>
          </Container>
        </Box>

        <Box paddingX={{ base: "4", md: "8" }} paddingY="4">
          {jobVms.length === 0 ? (
            <div className="mx-auto w-full max-w-6xl space-y-4">
              {resultsBar}
              <JobsEmpty filters={filters} />
            </div>
          ) : (
            <SearchResultsLayout
              startAd={
                startAd ? <AdRail label={startAd.label}>{startAd.content}</AdRail> : undefined
              }
              endAd={endAd ? <AdRail label={endAd.label}>{endAd.content}</AdRail> : undefined}
              list={
                <SearchResultsList
                  label={m.jobSearch_resultsRegionLabel()}
                  scrollRestorationId="jobs-search-results"
                >
                  <div className="space-y-4 p-4">
                    {resultsBar}

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
          )}
        </Box>
      </main>
    </Page>
  );
}
