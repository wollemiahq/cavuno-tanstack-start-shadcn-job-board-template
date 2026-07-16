'use client';

import { Users } from 'lucide-react';

import { m } from '../../paraglide/messages';

import { getTalentSearchLabels } from '@/board/talent-search-labels';
import { toTalentCardVM } from '@/board/talent-view-model';
import { TalentFilterControls } from '@/components/board/talent-filter-controls';
import { TalentSearchResult } from '@/components/board/talent-search-result';
import { Box } from '@/components/layout/box';
import { Container } from '@/components/layout/container';
import { Page } from '@/components/layout/page';
import {
  AdRail,
  SearchResultDetail,
  SearchResultsLayout,
  SearchResultsList,
} from '@/components/search-results/search-results';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { useSearchSelection } from '@/hooks/use-search-selection';
import type { TalentDirectoryEntry } from '@cavuno/board';

type AdPlacement = {
  label: string;
  content: React.ReactNode;
};

export function TalentSearchPage({
  candidates,
  q,
  skill,
  hasMore = false,
  onNextResults,
  onSearchSubmit,
  selectedTalent,
  onSelectedTalentReplace,
  onSelectedTalentPush,
  detail,
  startAd,
  endAd,
}: {
  candidates: TalentDirectoryEntry[];
  q?: string;
  skill?: string;
  hasMore?: boolean;
  onNextResults?: () => void;
  onSearchSubmit: (search: { q: string; skill: string }) => void;
  selectedTalent?: string;
  onSelectedTalentReplace: (handle: string) => void;
  onSelectedTalentPush: (handle: string) => void;
  detail: React.ReactNode;
  startAd?: AdPlacement;
  endAd?: AdPlacement;
}) {
  const labels = getTalentSearchLabels();
  const hasActiveSearch = Boolean(q || skill);
  const candidateVms = candidates.map((candidate) =>
    toTalentCardVM(candidate, labels),
  );
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
        <Box border="bottom" paddingX={{ base: '4', md: '8' }}>
          <Container width="wide" gutter="0">
            <div className="py-3">
              <TalentFilterControls
                q={q}
                skill={skill}
                labels={{
                  skill: m.talentSearch_skillLabel(),
                  skillPlaceholder: m.talentSearch_skillPlaceholder(),
                  search: m.talentDirectory_searchLabel(),
                }}
                onSubmit={onSearchSubmit}
              />
            </div>
          </Container>
        </Box>

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
                  label={m.talentSearch_resultsRegionLabel()}
                  scrollRestorationId="talent-search-results"
                >
                  <div className="space-y-4 pt-4 pr-4 pb-4">
                    {resultsBar}

                    <div className="space-y-3">
                      {candidateVms.map((vm, index) => (
                        <TalentSearchResult
                          key={vm.handle ?? `candidate-${index}`}
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
                      ))}
                    </div>

                    {hasMore && onNextResults ? (
                      <div className="flex justify-center">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={onNextResults}
                        >
                          {m.talentSearch_nextResultsLabel()}
                        </Button>
                      </div>
                    ) : null}
                  </div>
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
