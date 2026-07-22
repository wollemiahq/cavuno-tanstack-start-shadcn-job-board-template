'use client';

import { useLocation } from '@tanstack/react-router';
import { Users } from 'lucide-react';

import { m } from '../../paraglide/messages';

import type { TalentCardVM } from '@/board/talent-view-model';
import { CursorPagination } from '@/components/board/cursor-pagination';
import { TalentSearchResult } from '@/components/board/talent-search-result';
import { Page } from '@/components/layout/page';
import {
  AdRail,
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
import { cursorPageHref } from '@/lib/pagination';

type AdPlacement = {
  label: string;
  content: React.ReactNode;
};

export function TalentSearchPage({
  candidates,
  q,
  skill,
  hasPreviousResults = false,
  nextCursor,
  onPreviousResults,
  onNextResults,
  selectedTalent,
  onSelectedTalentReplace,
  onSelectedTalentPush,
  detail,
  startAd,
  endAd,
}: {
  candidates: TalentCardVM[];
  /** Header-owned candidate query (ADR-0075) — drives the empty-state copy. */
  q?: string;
  /** `?skill=` facet from a deep link — drives the empty-state copy. */
  skill?: string;
  /** Cursor pagination — a previous cursor page exists (not the first page). */
  hasPreviousResults?: boolean;
  /** The opaque forward cursor for the next page, or null on the last page. */
  nextCursor?: string | null;
  onPreviousResults?: () => void;
  onNextResults?: () => void;
  selectedTalent?: string;
  onSelectedTalentReplace: (handle: string) => void;
  onSelectedTalentPush: (handle: string) => void;
  detail: React.ReactNode;
  startAd?: AdPlacement;
  endAd?: AdPlacement;
}) {
  const currentHref = useLocation({ select: (location) => location.href });
  const hasActiveSearch = Boolean(q || skill);
  const candidateVms = candidates;
  const selectableHandles = candidateVms.flatMap((vm) =>
    vm.handle ? [vm.handle] : [],
  );
  const selection = useSearchSelection({
    selectedId: selectedTalent,
    resultIds: selectableHandles,
    onReplace: onSelectedTalentReplace,
    onPush: onSelectedTalentPush,
  });
  const resultsBar = (
    <div
      data-slot="talent-results-bar"
      className={candidateVms.length > 0 ? 'px-4 pb-3 md:px-0' : 'pb-3'}
    >
      <h1 className="text-foreground text-lg font-semibold tracking-tight">
        {m.talentSearch_resultsHeading()}
      </h1>
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
                <div className="space-y-4 px-4 pt-4 pb-4 md:col-span-2 md:px-0">
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
                  label={m.talentSearch_resultsRegionLabel()}
                  scrollRestorationId="talent-search-results"
                >
                    {resultsBar}

                    <div className="space-y-3">
                      {candidateVms.map((vm, index) => (
                        <div
                          key={vm.handle ?? `candidate-${index}`}
                          data-result-id={vm.handle ?? undefined}
                        >
                          <TalentSearchResult
                            vm={vm}
                            selected={
                              vm.handle !== null &&
                              vm.handle === selection.selectedId
                            }
                            onActivate={
                              vm.handle
                                ? (event) =>
                                    selection.onResultActivate(event, vm.handle!)
                                : undefined
                            }
                          />
                        </div>
                      ))}
                    </div>

                    <CursorPagination
                      hasPrevious={hasPreviousResults}
                      hasNext={Boolean(nextCursor)}
                      nextHref={
                        nextCursor
                          ? cursorPageHref(currentHref, nextCursor, [
                              'selectedTalent',
                            ])
                          : undefined
                      }
                      onPrevious={onPreviousResults}
                      onNext={onNextResults}
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
