'use client';

import { useEffect, useState } from 'react';

import { useLocation } from '@tanstack/react-router';
import { Users } from 'lucide-react';

import { m } from '../../paraglide/messages';

import {
  talentCardSelectionKey,
  type TalentCardVM,
} from '@/board/talent-view-model';
import {
  useListingAdRails,
  type AdPlacement,
} from '@/components/board/listing-ad-rail';
import { ListingPagination } from '@/components/board/listing-pagination';
import { TalentFilters } from '@/components/board/talent-filters';
import { TalentSaveToJob } from '@/components/board/talent-save-to-job';
import { TalentSearchResult } from '@/components/board/talent-search-result';
import { Page } from '@/components/layout/page';
import { useRootSession } from '@/components/root-session';
import {
  SearchResultDetail,
  SearchResultsLayout,
  SearchResultsList,
} from '@/components/search-results/search-results';
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
import { ADS_OFF, type BoardAdsConfig } from '@/lib/board-ads';
import { listingPageHref } from '@/lib/pagination';
import type { TalentSearch } from '@/lib/talent-search';
import { listEmployerJobs } from '@/server/employers';

export function TalentSearchPage({
  candidates,
  search = {},
  q,
  skill,
  count,
  page,
  pageSize,
  language,
  onPageChange,
  selectedTalent,
  onSelectedTalentReplace,
  onSelectedTalentPush,
  detail,
  startAd,
  endAd,
  ads = ADS_OFF,
}: {
  candidates: TalentCardVM[];
  search?: TalentSearch;
  /** Header-owned candidate query that drives the empty-state copy. */
  q?: string;
  /** `?skill=` facet from a deep link — drives the empty-state copy. */
  skill?: string;
  /** Total result count — drives the exact "Showing X–Y of N" range line. */
  count: number;
  /** Current 1-based page. */
  page: number;
  /** Directory page size — the offset window the loader requested. */
  pageSize: number;
  /** Board language, for number-formatting the range figures. */
  language: string;
  onPageChange: (page: number) => void;
  selectedTalent?: string;
  onSelectedTalentReplace: (handle: string) => void;
  onSelectedTalentPush: (handle: string) => void;
  detail: React.ReactNode;
  startAd?: AdPlacement;
  endAd?: AdPlacement;
  ads?: BoardAdsConfig;
}) {
  const rails = useListingAdRails(ads, startAd, endAd);
  const { employerCompanies } = useRootSession();
  const [saveTo, setSaveTo] = useState<{
    slug: string;
    jobs: Array<{ id: string; title: string }>;
  }>();
  useEffect(() => {
    const membership = (employerCompanies ?? []).find(
      (row) => row.status === 'approved' && row.company.slug,
    );
    const slug = membership?.company.slug;
    if (!slug) return;
    let cancelled = false;
    void listEmployerJobs({ data: { slug } })
      .then((result) => {
        if (cancelled) return;
        const jobs = (result.data ?? [])
          .filter((job) => job.status === 'published')
          .map((job) => ({ id: job.id, title: job.title }));
        if (jobs.length > 0) setSaveTo({ slug, jobs });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [employerCompanies]);
  const currentHref = useLocation({ select: (location) => location.href });
  const hasActiveSearch = Boolean(
    q ||
    skill ||
    search.jobSearchStatus ||
    search.languages ||
    search.openToRelocate ||
    search.place ||
    search.seniority ||
    search.sort,
  );
  const candidateVms = candidates;
  const selectableIds = candidateVms.flatMap((vm) => {
    const key = talentCardSelectionKey(vm);
    return key ? [key] : [];
  });
  const selection = useSearchSelection({
    selectedId: selectedTalent,
    resultIds: selectableIds,
    page,
    onReplace: onSelectedTalentReplace,
    onPush: onSelectedTalentPush,
  });
  // The talent directory is offset-paginated with a total `count`, so the
  // description line under the heading reports the exact "Showing X–Y of N"
  // range — the same honest range as Jobs and the companies browse index.
  const resultDescription =
    count > 0
      ? m.talentSearch_resultsShowingRange({
          from: ((page - 1) * pageSize + 1).toLocaleString(language),
          to: Math.min(page * pageSize, count).toLocaleString(language),
          count: count.toLocaleString(language),
        })
      : null;
  const resultsBar = (
    <div data-slot="talent-results-bar" className="pb-3">
      <h1 className="text-foreground text-lg font-semibold tracking-tight">
        {m.talentSearch_resultsHeading()}
      </h1>
      {resultDescription ? (
        <p className="text-muted-foreground text-xs">{resultDescription}</p>
      ) : null}
    </div>
  );

  return (
    <Page width="wide" fill>
      <main
        data-layout="talent-search-page"
        className="md:flex md:h-full md:min-h-0 md:flex-col"
      >
        <div
          data-slot="talent-search-viewport"
          className="min-w-0 overflow-x-clip md:flex md:min-h-0 md:flex-1 md:overflow-hidden"
        >
          {candidateVms.length === 0 ? (
            <SearchResultsLayout
              startAd={rails.startAd}
              endAd={rails.endAd}
              list={
                <div className="space-y-4 px-4 pt-4 pb-4 md:col-span-2 md:px-0">
                  <TalentFilters search={search} />
                  {resultsBar}
                  <Empty className="min-h-[calc(100dvh-16rem)] border-0">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <Users aria-hidden="true" />
                      </EmptyMedia>
                      <EmptyTitle>{m.talentDirectory_title()}</EmptyTitle>
                      <EmptyDescription>
                        {hasActiveSearch
                          ? m.talentSearch_noMatchText()
                          : m.talentDirectory_emptyText()}
                      </EmptyDescription>
                    </EmptyHeader>
                    {hasActiveSearch ? (
                      <EmptyContent>
                        <a href="/talent" className={buttonVariants()}>
                          {m.jobSearch_resetFiltersAction()}
                        </a>
                      </EmptyContent>
                    ) : null}
                  </Empty>
                </div>
              }
              detail={null}
            />
          ) : (
            <SearchResultsLayout
              startAd={rails.startAd}
              endAd={rails.endAd}
              list={
                <SearchResultsList
                  ref={selection.listRef}
                  label={m.talentSearch_resultsRegionLabel()}
                  scrollRestorationId="talent-search-results"
                >
                  <TalentFilters search={search} />
                  {resultsBar}

                  <div className="space-y-3">
                    {candidateVms.map((vm) => {
                      const selectionKey = talentCardSelectionKey(vm);
                      return (
                        <div
                          key={vm.id}
                          data-result-id={selectionKey ?? undefined}
                        >
                          <TalentSearchResult
                            vm={vm}
                            selected={
                              selectionKey !== null &&
                              selectionKey === selection.selectedId
                            }
                            save={
                              saveTo ? (
                                <TalentSaveToJob
                                  slug={saveTo.slug}
                                  jobs={saveTo.jobs}
                                  candidateBoardUserId={vm.id}
                                />
                              ) : null
                            }
                            onActivate={
                              selectionKey
                                ? (event) =>
                                    selection.onResultActivate(
                                      event,
                                      selectionKey,
                                    )
                                : undefined
                            }
                          />
                        </div>
                      );
                    })}
                  </div>

                  <ListingPagination
                    compact
                    page={page}
                    count={count}
                    pageSize={pageSize}
                    hrefForPage={(nextPage) =>
                      listingPageHref(currentHref, nextPage, ['selectedTalent'])
                    }
                    onPageChange={onPageChange}
                  />
                </SearchResultsList>
              }
              detail={
                <SearchResultDetail
                  ref={selection.detailRef}
                  label={m.talentSearch_selectedProfileRegionLabel()}
                  scrollRestorationId="talent-selected-detail"
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
