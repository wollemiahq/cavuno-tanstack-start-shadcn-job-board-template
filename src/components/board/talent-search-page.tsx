'use client';

import {
  cloneElement,
  isValidElement,
  useEffect,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';

import { useLocation } from '@tanstack/react-router';
import { Users } from 'lucide-react';

import { m } from '../../paraglide/messages';

import { getTalentSearchLabels } from '@/board/talent-search-labels';
import {
  talentCardSelectionKey,
  toTalentCardVM,
  type TalentCardVM,
} from '@/board/talent-view-model';
import {
  useListingAdRails,
  type AdPlacement,
} from '@/components/board/listing-ad-rail';
import { ListingPagination } from '@/components/board/listing-pagination';
import { TalentFilters } from '@/components/board/talent-filters';
import { TalentListsPicker } from '@/components/board/talent-lists-picker';
import { TalentSaveToJob } from '@/components/board/talent-save-to-job';
import { TalentSearchResult } from '@/components/board/talent-search-result';
import { Box } from '@/components/layout/box';
import { Container } from '@/components/layout/container';
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
import { talentSearchToListFilters } from '@/lib/talent-search';
import {
  listEmployerJobs,
  listSourcedCandidates,
  listTalentLists,
  type TalentListRecord,
} from '@/server/employers';
import type { TalentDirectoryEntry } from '@cavuno/board';

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
  profileUnlocks = false,
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
  profileUnlocks?: boolean;
}) {
  const rails = useListingAdRails(ads, startAd, endAd);
  const { employerCompanies } = useRootSession();
  const [workspace, setWorkspace] = useState<{
    slug: string;
    jobs: Array<{ id: string; title: string }>;
  }>();
  const [lists, setLists] = useState<TalentListRecord[]>([]);
  const [sourcedIds, setSourcedIds] = useState<Set<string>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<string>>(() => new Set());
  const [sourcedVms, setSourcedVms] = useState<TalentCardVM[] | null>(null);
  const selectedList = lists.find((list) => list.id === search.list);
  const viewingSourced = Boolean(search.sourced);
  const boundJobId = selectedList?.jobId ?? search.sourced;
  useEffect(() => {
    const membership = (employerCompanies ?? []).find(
      (row) => row.status === 'approved' && row.company.slug,
    );
    const slug = membership?.company.slug;
    if (!slug) return;
    let cancelled = false;
    void Promise.all([
      listEmployerJobs({ data: { slug } }),
      listTalentLists({ data: { slug } }),
    ])
      .then(([jobsResult, listsResult]) => {
        if (cancelled) return;
        const jobs = (jobsResult.data ?? [])
          .filter((job) => job.status === 'published')
          .map((job) => ({ id: job.id, title: job.title }));
        setWorkspace({ slug, jobs });
        setLists(listsResult.data ?? []);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [employerCompanies]);
  useEffect(() => {
    const jobId = search.sourced ?? boundJobId;
    if (!workspace || !jobId) {
      setSourcedIds(new Set());
      setSourcedVms(null);
      return;
    }
    let cancelled = false;
    void listSourcedCandidates({
      data: { slug: workspace.slug, job: jobId },
    })
      .then((result) => {
        if (cancelled) return;
        const rows = result.data ?? [];
        setSourcedIds(new Set(rows.map((row) => row.candidate.id)));
        if (!search.sourced) {
          setSourcedVms(null);
          return;
        }
        const labels = getTalentSearchLabels();
        setSourcedVms(
          rows.map((row) =>
            // SAFETY: TLS-04 sourced GET returns TalentDirectoryEntry cards;
            // SourcedRailItem only names the kanban fields of that payload.
            toTalentCardVM(row.candidate as TalentDirectoryEntry, labels, {
              profileUnlocks,
            }),
          ),
        );
      })
      .catch(() => {
        if (cancelled) return;
        setSourcedIds(new Set());
        setSourcedVms(search.sourced ? [] : null);
      });
    return () => {
      cancelled = true;
    };
  }, [boundJobId, profileUnlocks, search.sourced, workspace]);
  const currentHref = useLocation({ select: (location) => location.href });
  const hasActiveSearch = Boolean(
    q ||
    skill ||
    search.jobSearchStatus ||
    search.languages ||
    search.openToRelocate ||
    search.place ||
    search.seniority ||
    search.permitCountry ||
    search.interestedRole ||
    search.sort ||
    viewingSourced,
  );
  const candidateVms = viewingSourced ? (sourcedVms ?? []) : candidates;
  function markSaved(id: string) {
    setSavedIds((current) => {
      const next = new Set(current);
      next.add(id);
      return next;
    });
  }
  function saveControl(
    candidateBoardUserId: string,
    presentation: 'icon' | 'default',
  ) {
    if (!workspace || workspace.jobs.length === 0) return null;
    return (
      <TalentSaveToJob
        presentation={presentation}
        slug={workspace.slug}
        jobs={workspace.jobs}
        candidateBoardUserId={candidateBoardUserId}
        boundJobId={boundJobId}
        alreadySaved={
          sourcedIds.has(candidateBoardUserId) ||
          savedIds.has(candidateBoardUserId)
        }
        onSaved={() => markSaved(candidateBoardUserId)}
      />
    );
  }
  const selectedVm = candidateVms.find(
    (vm) => talentCardSelectionKey(vm) === selectedTalent,
  );
  let detailWithSave = detail;
  const detailSave = selectedVm ? saveControl(selectedVm.id, 'default') : null;
  if (detailSave && isValidElement(detail)) {
    // SAFETY: talent detail panes accept saveSlot; host-element test stubs
    // ignore the extra prop.
    detailWithSave = cloneElement(
      detail as ReactElement<{ saveSlot?: ReactNode }>,
      {
        saveSlot: detailSave,
      },
    );
  }
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
  const resultCount = viewingSourced ? candidateVms.length : count;
  const resultPage = viewingSourced ? 1 : page;
  const resultPageSize = viewingSourced
    ? Math.max(candidateVms.length, 1)
    : pageSize;
  const resultDescription =
    resultCount > 0
      ? m.talentSearch_resultsShowingRange({
          from: ((resultPage - 1) * resultPageSize + 1).toLocaleString(
            language,
          ),
          to: Math.min(resultPage * resultPageSize, resultCount).toLocaleString(
            language,
          ),
          count: resultCount.toLocaleString(language),
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
        <Box border="bottom" paddingX={{ base: '4', md: '8' }}>
          <Container width="wide" gutter="0">
            <div className="py-3">
              <TalentFilters
                search={search}
                lists={
                  workspace ? (
                    <TalentListsPicker
                      slug={workspace.slug}
                      lists={lists}
                      jobs={workspace.jobs}
                      selectedListId={search.list}
                      selectedSourcedJobId={search.sourced}
                      currentFilters={talentSearchToListFilters(search)}
                      onListsChange={setLists}
                    />
                  ) : null
                }
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
              startAd={rails.startAd}
              endAd={rails.endAd}
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
              startAd={rails.startAd}
              endAd={rails.endAd}
              list={
                <SearchResultsList
                  ref={selection.listRef}
                  label={m.talentSearch_resultsRegionLabel()}
                  scrollRestorationId="talent-search-results"
                >
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
                            saveSlot={saveControl(vm.id, 'icon')}
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

                  {viewingSourced ? null : (
                    <ListingPagination
                      compact
                      page={page}
                      count={count}
                      pageSize={pageSize}
                      hrefForPage={(nextPage) =>
                        listingPageHref(currentHref, nextPage, [
                          'selectedTalent',
                        ])
                      }
                      onPageChange={onPageChange}
                    />
                  )}
                </SearchResultsList>
              }
              detail={
                <SearchResultDetail
                  ref={selection.detailRef}
                  label={m.talentSearch_selectedProfileRegionLabel()}
                  scrollRestorationId="talent-selected-detail"
                >
                  {detailWithSave}
                </SearchResultDetail>
              }
            />
          )}
        </div>
      </main>
    </Page>
  );
}
