'use client';

import { Users } from 'lucide-react';

import { m } from '../../paraglide/messages';

import { getTalentSearchLabels } from '@/board/talent-search-labels';
import { toTalentCardVM } from '@/board/talent-view-model';
import type { BreadcrumbData } from '@/components/board/breadcrumb';
import { PageHeaderWithBreadcrumb } from '@/components/board/page-header-with-breadcrumb';
import { TalentSearchControls } from '@/components/board/talent-search-controls';
import { TalentSearchResult } from '@/components/board/talent-search-result';
import { Box } from '@/components/layout/box';
import { Page } from '@/components/layout/page';
import {
  AdRail,
  SearchResultDetail,
  SearchResultsLayout,
  SearchResultsList,
} from '@/components/search-results/search-results';
import { Button } from '@/components/ui/button';
import {
  Empty,
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
  heading,
  description,
  breadcrumb,
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
  heading?: string;
  description?: string;
  breadcrumb?: BreadcrumbData;
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

  return (
    <Page width="wide">
      <main data-layout="talent-search-page">
        <Box background="muted" border="bottom">
          <PageHeaderWithBreadcrumb
            breadcrumb={breadcrumb}
            align="center"
            title={heading ?? m.talentDirectory_title()}
            description={description}
          >
            <div className="mt-2 w-full max-w-5xl text-left">
              <TalentSearchControls
                q={q}
                skill={skill}
                labels={{
                  query: m.talentSearch_queryLabel(),
                  queryPlaceholder: m.talentDirectory_searchPlaceholder(),
                  skill: m.talentSearch_skillLabel(),
                  skillPlaceholder: m.talentSearch_skillPlaceholder(),
                  search: m.talentDirectory_searchLabel(),
                }}
                onSubmit={onSearchSubmit}
              />
            </div>
          </PageHeaderWithBreadcrumb>
        </Box>

        <Box
          paddingX={{ base: '4', md: '8' }}
          paddingY={{ base: '6', md: '8' }}
        >
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
                <div className="space-y-4 p-4">
                  <p className="text-muted-foreground text-sm font-medium">
                    {m.talentSearch_resultsHeading()}
                  </p>

                  {candidateVms.length > 0 ? (
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
                  ) : (
                    <Empty className="min-h-72 border">
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <Users aria-hidden="true" />
                        </EmptyMedia>
                        <EmptyTitle>{m.talentDirectory_title()}</EmptyTitle>
                        <EmptyDescription>
                          {q || skill
                            ? m.talentSearch_noMatchText()
                            : m.talentDirectory_emptyText()}
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  )}

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
        </Box>
      </main>
    </Page>
  );
}
