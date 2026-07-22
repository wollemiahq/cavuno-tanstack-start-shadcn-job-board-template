'use client';

import { Link, useLocation } from '@tanstack/react-router';
import { Search } from 'lucide-react';

import { m } from '../../paraglide/messages';

import {
  relatedSearchesTitle,
  relatedSearchesToChips,
} from '@/board/related-searches';
import type { BreadcrumbData } from '@/components/board/breadcrumb';
import { JobSearchResult } from '@/components/board/job-search-result';
import { JobsFilterControls } from '@/components/board/jobs-filter-controls';
import { JobsResultsBar } from '@/components/board/jobs-results-bar';
import { ListingResultsHeader } from '@/components/board/listing-page-header';
import { ListingPagination } from '@/components/board/listing-pagination';
import { SaveJobButton } from '@/components/board/save-job-button';
import { Box } from '@/components/layout/box';
import { Container } from '@/components/layout/container';
import { Page } from '@/components/layout/page';
import {
  AdRail,
  SearchResultDetail,
  SearchResultsLayout,
  SearchResultsList,
} from '@/components/search-results/search-results';
import { Alert, AlertAction, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { useSearchSelection } from '@/hooks/use-search-selection';
import { listingPageHref } from '@/lib/pagination';
import type { JobCardVM } from '@/board/job-view-model';
import type { RelatedSearch } from '@cavuno/board';
import type { ListingFilters } from '@cavuno/board/filters';
import type { BoardLabelOverrides } from '@cavuno/board/format';

type AdPlacement = {
  label: string;
  content: React.ReactNode;
};

function JobsEmpty({
  filters,
  hasRouteConstraint,
}: {
  filters: ListingFilters;
  hasRouteConstraint: boolean;
}) {
  const hasFilters = Boolean(
    filters.remoteOption || filters.employmentType || filters.seniority?.length,
  );
  const noMatch = hasRouteConstraint || hasFilters || Boolean(filters.q);

  return (
    <Empty className="min-h-[calc(100dvh-16rem)] border-0">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Search aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>
          {noMatch
            ? m.jobSearch_noMatchingResultsHeading()
            : m.jobSearch_headingJobs()}
        </EmptyTitle>
        <EmptyDescription>
          {noMatch
            ? m.jobSearch_queryEmptyText()
            : m.jobSearch_initialEmptyText()}
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
  breadcrumb,
  relatedSearches,
  onFiltersChange,
  onPageChange,
  selectedJob,
  onSelectedJobReplace,
  onSelectedJobPush,
  detail,
  startAd,
  endAd,
  viewer,
  onSaveJob,
}: {
  jobs: JobCardVM[];
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
  onPageChange: (page: number) => void;
  selectedJob?: string;
  onSelectedJobReplace: (jobSlug: string) => void;
  onSelectedJobPush: (jobSlug: string) => void;
  detail: React.ReactNode;
  startAd?: AdPlacement;
  endAd?: AdPlacement;
  viewer: { emailVerified: boolean } | null;
  onSaveJob: (jobId: string) => Promise<void>;
}) {
  const returnTo = useLocation({ select: (location) => location.href });
  const jobVms = jobs;
  const selectableSlugs = jobVms.flatMap((vm) =>
    vm.jobSlug && vm.detailHref ? [vm.jobSlug] : [],
  );
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
      language={language}
      labels={labels}
      className={jobVms.length > 0 ? 'px-4 md:px-0' : undefined}
    />
  );
  return (
    <Page width="wide" fill>
      <main
        data-layout="job-search-page"
        className="md:flex md:h-full md:min-h-0 md:flex-col"
      >
        <Box border="bottom" paddingX={{ base: '4', md: '8' }}>
          <Container width="wide" gutter="0">
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

        <div
          data-slot="job-search-viewport"
          className="min-w-0 overflow-x-clip md:flex md:min-h-0 md:flex-1 md:overflow-hidden"
        >
          {jobVms.length === 0 ? (
            <SearchResultsLayout
              startAd={
                startAd ? (
                  <AdRail label={startAd.label}>{startAd.content}</AdRail>
                ) : undefined
              }
              endAd={
                endAd ? (
                  <AdRail label={endAd.label}>{endAd.content}</AdRail>
                ) : undefined
              }
              list={
                <div
                  data-slot="job-empty-results"
                  className="space-y-4 px-4 pt-4 pb-4 md:col-span-2 md:px-0"
                >
                  <ListingResultsHeader breadcrumb={breadcrumb}>
                    {resultsBar}
                  </ListingResultsHeader>
                  <JobsEmpty
                    filters={filters}
                    hasRouteConstraint={Boolean(heading)}
                  />
                </div>
              }
              detail={null}
            />
          ) : (
            <SearchResultsLayout
              startAd={
                startAd ? (
                  <AdRail label={startAd.label}>{startAd.content}</AdRail>
                ) : undefined
              }
              endAd={
                endAd ? (
                  <AdRail label={endAd.label}>{endAd.content}</AdRail>
                ) : undefined
              }
              list={
                <SearchResultsList
                  ref={selection.listRef}
                  label={m.jobSearch_resultsRegionLabel()}
                  scrollRestorationId="jobs-search-results"
                >
                    <ListingResultsHeader breadcrumb={breadcrumb}>
                      {resultsBar}
                    </ListingResultsHeader>

                    <div className="space-y-3">
                      {jobVms.map((vm) => (
                        <div key={vm.id} data-result-id={vm.jobSlug ?? undefined}>
                        <JobSearchResult
                          vm={vm}
                          selected={vm.jobSlug === selection.selectedId}
                          onActivate={
                            vm.jobSlug
                              ? (event) =>
                                  selection.onResultActivate(event, vm.jobSlug!)
                              : undefined
                          }
                          saveSlot={
                            <SaveJobButton
                              jobId={vm.id}
                              viewer={viewer}
                              returnTo={returnTo}
                              presentation="icon"
                              labels={{
                                save: m.companyJobDetail_saveJobLabel(),
                                saving: m.companyJobDetail_savingLabel(),
                                saved:
                                  m.companyJobDetail_savedViewInAccountLabel(),
                                error: m.saveJobButton_errorText(),
                              }}
                              onSave={onSaveJob}
                            />
                          }
                        />
                        </div>
                      ))}
                    </div>

                    {gatedCount && gatedCount > 0 ? (
                      <Alert
                        aria-label={m.jobSearch_unlockMoreLabel()}
                        className="bg-muted flex flex-col items-start gap-3 pr-4"
                      >
                        <AlertDescription>
                          {m.jobSearch_gatedCountText({
                            count: gatedCount.toLocaleString(language),
                          })}
                        </AlertDescription>
                        <AlertAction className="static">
                          <a
                            href={`/account/access?${new URLSearchParams({ returnTo }).toString()}`}
                            className={buttonVariants({ size: 'sm' })}
                          >
                            {m.jobSearch_unlockMoreLabel()}
                          </a>
                        </AlertAction>
                      </Alert>
                    ) : null}

                    <ListingPagination
                      compact
                      page={page}
                      count={count ?? 0}
                      pageSize={pageSize}
                      hrefForPage={(nextPage) =>
                        listingPageHref(returnTo, nextPage, ['selectedJob'])
                      }
                      onPageChange={onPageChange}
                    />

                    {relatedChips.length > 0 ? (
                      <section
                        aria-label={relatedSearchesTitle(labels)}
                        className="border-border space-y-3 border-t pt-4"
                      >
                        <h2 className="text-sm font-semibold">
                          {relatedSearchesTitle(labels)}
                        </h2>
                        <div className="flex flex-wrap gap-1.5">
                          {relatedChips.map((chip) => (
                            <Badge
                              key={chip.key}
                              variant="outline"
                              render={<a href={chip.href} />}
                            >
                              {chip.name}
                            </Badge>
                          ))}
                        </div>
                      </section>
                    ) : null}
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
        </div>
      </main>
    </Page>
  );
}
