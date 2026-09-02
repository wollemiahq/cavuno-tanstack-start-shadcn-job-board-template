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
import { TalentListJobLink } from '@/components/board/talent-list-job-link';
import { TalentListsPicker } from '@/components/board/talent-lists-picker';
import type { StartTalentConversation } from '@/components/board/talent-message-action';
import { TalentSaveToJob } from '@/components/board/talent-save-to-job';
import { TalentSearchResult } from '@/components/board/talent-search-result';
import { Box } from '@/components/layout/box';
import { Container } from '@/components/layout/container';
import { Page } from '@/components/layout/page';
import { InPlaceListingSelect } from '@/components/master-detail-link';
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
import {
  talentListFiltersEqual,
  talentSearchToListFilters,
} from '@/lib/talent-search';
import {
  getEmployerTalentWorkspace,
  getPipeline,
  listSourcedCandidates,
  updateTalentList,
  type TalentListRecord,
} from '@/server/employers';
import { isReactComponent } from '@/utils/is-react-component';
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
  const [sourcedMembership, setSourcedMembership] = useState<{
    jobId?: string;
    ids: Set<string>;
  }>({ ids: new Set() });
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
    void getEmployerTalentWorkspace({ data: { slug } })
      .then((result) => {
        if (cancelled) return;
        const jobs = (result.jobs.data ?? [])
          .filter((job) => job.status === 'published')
          .map((job) => ({ id: job.id, title: job.title }));
        setWorkspace({ slug, jobs });
        setLists(result.lists.data ?? []);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [employerCompanies]);
  useEffect(() => {
    if (!workspace || !selectedList) return;
    const nextFilters = talentSearchToListFilters(search);
    if (talentListFiltersEqual(nextFilters, selectedList.filters)) return;
    let cancelled = false;
    void updateTalentList({
      data: {
        slug: workspace.slug,
        listId: selectedList.id,
        filters: nextFilters,
      },
    })
      .then((result) => {
        if (cancelled || !result.ok) return;
        setLists((current) =>
          current.map((list) =>
            list.id === result.data.id ? result.data : list,
          ),
        );
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [search, selectedList, workspace]);
  useEffect(() => {
    const jobId = search.sourced ?? boundJobId;
    if (!workspace || !jobId) {
      setSourcedMembership({ ids: new Set() });
      setSourcedVms(null);
      return;
    }
    let cancelled = false;
    void Promise.all([
      listSourcedCandidates({
        data: { slug: workspace.slug, job: jobId },
      }),
      getPipeline({ data: { slug: workspace.slug, job: jobId } }).catch(
        () => null,
      ),
    ])
      .then(([sourced, pipeline]) => {
        if (cancelled) return;
        const rows = sourced.data ?? [];
        const pipelineIds = (pipeline?.applicants ?? []).flatMap((row) =>
          row.candidateBoardUserId ? [row.candidateBoardUserId] : [],
        );
        const fetchedIds = [
          ...rows.map((row) => row.candidate.id),
          ...pipelineIds,
        ];
        setSourcedMembership((current) => {
          const ids = new Set(fetchedIds);
          if (current.jobId === jobId) {
            for (const id of current.ids) ids.add(id);
          }
          return { jobId, ids };
        });
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
        setSourcedMembership({ ids: new Set() });
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
        lists={lists}
        candidateBoardUserId={candidateBoardUserId}
        boundJobId={boundJobId}
        alreadySaved={
          sourcedMembership.jobId === boundJobId &&
          sourcedMembership.ids.has(candidateBoardUserId)
        }
        onSaved={() => {
          if (!boundJobId) return;
          setSourcedMembership((current) => {
            if (current.jobId === boundJobId) {
              const ids = new Set(current.ids);
              ids.add(candidateBoardUserId);
              return { jobId: boundJobId, ids };
            }
            return { jobId: boundJobId, ids: new Set([candidateBoardUserId]) };
          });
        }}
      />
    );
  }
  const selectedVm = candidateVms.find(
    (vm) => talentCardSelectionKey(vm) === selectedTalent,
  );
  let detailWithSave = detail;
  const detailSave = selectedVm ? saveControl(selectedVm.id, 'default') : null;
  if (isValidElement(detail) && isReactComponent(detail.type)) {
    // SAFETY: employer talent detail components accept saveSlot and
    // onStartConversation; host elements are excluded by isReactComponent.
    const existing = detail as ReactElement<{
      saveSlot?: ReactNode;
      onStartConversation?: StartTalentConversation;
    }>;
    const start = existing.props.onStartConversation;
    detailWithSave = cloneElement(existing, {
      saveSlot: detailSave ?? existing.props.saveSlot,
      onStartConversation: start
        ? (input) => start(boundJobId ? { ...input, job: boundJobId } : input)
        : start,
    });
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
                      currentFilters={talentSearchToListFilters(search)}
                      onListsChange={setLists}
                    />
                  ) : null
                }
                linkJob={
                  workspace && selectedList ? (
                    <TalentListJobLink
                      slug={workspace.slug}
                      listId={selectedList.id}
                      jobId={selectedList.jobId}
                      jobs={workspace.jobs}
                      onUpdated={(list) =>
                        setLists((current) =>
                          current.map((row) =>
                            row.id === list.id ? list : row,
                          ),
                        )
                      }
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

                  <InPlaceListingSelect onSelect={selection.onResultActivate}>
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
                            />
                          </div>
                        );
                      })}
                    </div>
                  </InPlaceListingSelect>

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
