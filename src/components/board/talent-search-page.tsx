'use client';
import {
  cloneElement,
  isValidElement,
  useEffect,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';

import { Link, useLocation, useNavigate } from '@tanstack/react-router';
import { Bookmark, Users } from 'lucide-react';

import { m } from '../../paraglide/messages';
import { ListingAdResults } from './listing-ad-results';

import { stageFilterTokens, visibleStages } from '@/board/pipeline-stages';
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
import {
  SearchRadiusScope,
  TALENT_SEARCH_RADIUS_SENTENCES,
} from '@/components/board/search-radius-scope';
import { TalentFilters } from '@/components/board/talent-filters';
import { TalentListJobLink } from '@/components/board/talent-list-job-link';
import { TalentListsPicker } from '@/components/board/talent-lists-picker';
import type { StartTalentConversation } from '@/components/board/talent-message-action';
import {
  TalentSaveToJob,
  type TalentListMembershipChange,
} from '@/components/board/talent-save-to-job';
import { TalentSavedViewControls } from '@/components/board/talent-saved-view';
import { TalentSearchResult } from '@/components/board/talent-search-result';
import { Box } from '@/components/layout/box';
import { Page } from '@/components/layout/page';
import { InPlaceListingSelect } from '@/components/master-detail-link';
import { useRootSession } from '@/components/root-session';
import {
  SearchResultDetail,
  SearchResultsLayout,
  SearchResultsList,
  SearchResultsToolbar,
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
import { Skeleton } from '@/components/ui/skeleton';
import { useSearchSelection } from '@/hooks/use-search-selection';
import { ADS_OFF, type BoardAdsConfig } from '@/lib/board-ads';
import {
  pickCustomFieldSearch,
  resolveCustomFieldFilters,
  type CustomFilterField,
} from '@/lib/custom-field-filters';
import { clampPage, listingPageHref } from '@/lib/pagination';
import { resultsShowingLine, type ResultsSpan } from '@/lib/results-showing';
import {
  listFiltersToTalentSearch,
  narrowsSavedPeople,
  savedPeopleFilters,
  talentListFiltersEqual,
  talentSearchToListFilters,
  type TalentSearch,
} from '@/lib/talent-search';
import {
  getEmployerTalentWorkspace,
  getPipeline,
  listSavedPeople,
  listTalentListMemberships,
  updateTalentList,
  type SavedPeoplePage,
  type SavedPeopleRequest,
  type TalentListRecord,
} from '@/server/employers';
import type { TalentPlaceRadius } from '@/server/talent-pages';
import { isReactComponent } from '@/utils/is-react-component';
import type { EmployerPipeline } from '@cavuno/board';

type SavedResult =
  | { key: string; listId: string; status: 'ready'; result: SavedPeoplePage }
  | { key: string; listId: string; status: 'error' };

export function TalentSearchPage({
  candidates,
  search = {},
  customFilterFields,
  q,
  skill,
  count,
  page: requestedPage,
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
  placeRadius = null,
  onWithinChange,
}: {
  candidates: TalentCardVM[];
  search?: TalentSearch;
  /** Public candidate profile fields for the "All filters" sheet. */
  customFilterFields?: CustomFilterField[];
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
  /**
   * The distance control of a city or locality `place` search; it replaces
   * the "Showing X–Y of N" line with "… within 25 mi of Houston".
   */
  placeRadius?: TalentPlaceRadius | null;
  /** The new `within` URL value; see `SearchRadiusScope`. */
  onWithinChange?: (within: number | undefined) => void;
}) {
  // The loader served the last API-reachable page for anything deeper, so
  // the range label, the active page and Next/Previous must agree with it.
  const page = clampPage(requestedPage, pageSize);
  const rails = useListingAdRails(ads, startAd, endAd);
  const navigate = useNavigate({ from: '/talent/' });
  const { employerCompanies, ready: sessionReady, user } = useRootSession();
  /** Whether the viewer's employer companies are known (none, or loaded). */
  const employerKnown =
    sessionReady && (!user?.emailVerified || employerCompanies !== null);
  const employerSlug = (employerCompanies ?? []).find(
    (row) => row.status === 'approved' && row.company.slug,
  )?.company.slug;
  const [workspace, setWorkspace] = useState<{
    slug: string;
    jobs: Array<{ id: string; title: string }>;
  }>();
  const [workspaceFailed, setWorkspaceFailed] = useState(false);
  const [lists, setLists] = useState<TalentListRecord[]>([]);
  /** The lists each candidate is saved to, by board-user id, once read. */
  const [memberships, setMemberships] = useState<
    Record<string, readonly string[]>
  >({});
  /** Candidates whose memberships could not be read (retried on reopen). */
  const [membershipsFailed, setMembershipsFailed] = useState<readonly string[]>(
    [],
  );
  const [savedResult, setSavedResult] = useState<SavedResult | null>(null);
  const [savedReload, setSavedReload] = useState(0);
  const [linkedPipeline, setLinkedPipeline] = useState<{
    jobId: string;
    pipeline: Pick<EmployerPipeline, 'stages'>;
  } | null>(null);
  const selectedList = lists.find((list) => list.id === search.list);
  const boundJobId = selectedList?.jobId ?? undefined;
  useEffect(() => {
    if (!employerSlug) return;
    let cancelled = false;
    void getEmployerTalentWorkspace({ data: { slug: employerSlug } })
      .then((result) => {
        if (cancelled) return;
        const jobs = (result.jobs.data ?? [])
          .filter((job) => job.status === 'published')
          .map((job) => ({ id: job.id, title: job.title }));
        setWorkspace({ slug: employerSlug, jobs });
        setLists(result.lists.data ?? []);
      })
      .catch(() => {
        if (!cancelled) setWorkspaceFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [employerSlug]);
  useEffect(() => {
    // The Saved view narrows what is shown; it never rewrites the search.
    if (!workspace || !selectedList || search.saved) return;
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

  // ── Saved view: the open list's saved people, filtered like /talent ──────
  const savedRequested = Boolean(search.saved && search.list);
  /** The open lists are known (or never will be: no employer, or failed). */
  const listsSettled =
    employerKnown && (!employerSlug || Boolean(workspace) || workspaceFailed);
  const savedView = savedRequested && Boolean(selectedList);
  /** `?saved=1` while the lists that could resolve it still load. */
  const savedListPending = savedRequested && !listsSettled;
  const savedMode = savedView || savedListPending;
  useEffect(() => {
    // A Saved view of a list this viewer cannot open is just the directory.
    if (!savedRequested || !listsSettled || selectedList) return;
    void navigate({
      replace: true,
      search: (previous) => ({
        ...previous,
        saved: undefined,
        stage: undefined,
      }),
    });
  }, [savedRequested, listsSettled, selectedList, navigate]);
  const linkedJobForStages = savedView ? selectedList?.jobId : null;
  useEffect(() => {
    if (!workspace || !linkedJobForStages) return;
    let cancelled = false;
    void getPipeline({
      data: { slug: workspace.slug, job: linkedJobForStages },
    })
      .then((pipeline) => {
        if (cancelled) return;
        setLinkedPipeline({ jobId: linkedJobForStages, pipeline });
      })
      .catch(() => {
        // No stages to offer; a `?stage=` is then cleared below.
        if (!cancelled) {
          setLinkedPipeline({
            jobId: linkedJobForStages,
            pipeline: { stages: [] },
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [linkedJobForStages, workspace]);
  const stagesLoaded =
    !linkedJobForStages || linkedPipeline?.jobId === linkedJobForStages;
  const pipeline =
    linkedJobForStages && stagesLoaded && linkedPipeline
      ? linkedPipeline.pipeline
      : { stages: [] };
  const stages = visibleStages(pipeline);
  const stage = stages.some((row) => row.id === search.stage)
    ? search.stage
    : undefined;
  const staleStage =
    savedView && stagesLoaded && Boolean(search.stage) && !stage;
  useEffect(() => {
    if (!staleStage) return;
    void navigate({
      replace: true,
      search: (previous) => ({ ...previous, stage: undefined }),
    });
  }, [staleStage, navigate]);
  const savedRequestKey =
    savedView && workspace && selectedList && (!search.stage || stagesLoaded)
      ? JSON.stringify({
          slug: workspace.slug,
          listId: selectedList.id,
          query: savedPeopleFilters(search),
          offset: (page - 1) * pageSize,
          limit: pageSize,
          // Every application stage the chosen column shows.
          stage: stage
            ? stageFilterTokens(pipeline, stage)?.join(',')
            : undefined,
          reload: savedReload,
        } satisfies SavedPeopleRequest & { reload: number })
      : null;
  useEffect(() => {
    if (!savedRequestKey) return;
    // SAFETY: the key is JSON.stringify of a SavedPeopleRequest built just above.
    const { reload: _reload, ...request } = JSON.parse(
      savedRequestKey,
    ) as SavedPeopleRequest & { reload: number };
    let cancelled = false;
    void listSavedPeople({ data: request })
      .then((result) => {
        if (!cancelled) {
          setSavedResult({
            key: savedRequestKey,
            listId: request.listId,
            status: 'ready',
            result,
          });
        }
      })
      .catch(() => {
        if (cancelled) return;
        setSavedResult({
          key: savedRequestKey,
          listId: request.listId,
          status: 'error',
        });
      });
    return () => {
      cancelled = true;
    };
  }, [savedRequestKey]);
  // While the next page loads, keep the last one on screen rather than
  // flashing an empty state.
  const savedShown =
    savedResult &&
    savedResult.listId === selectedList?.id &&
    (savedResult.status === 'ready' || savedResult.key === savedRequestKey)
      ? savedResult
      : null;
  const savedPage = savedShown?.status === 'ready' ? savedShown.result : null;
  /** A page past the last one (people removed, or an old link). */
  const savedLastPage =
    savedView &&
    savedShown?.key === savedRequestKey &&
    savedPage &&
    savedPage.count > 0 &&
    savedPage.data.length === 0 &&
    Math.ceil(savedPage.count / pageSize) < page
      ? Math.ceil(savedPage.count / pageSize)
      : null;
  useEffect(() => {
    if (savedLastPage === null) return;
    void navigate({
      replace: true,
      search: (previous) => ({
        ...previous,
        page: savedLastPage > 1 ? savedLastPage : undefined,
        selectedTalent: undefined,
      }),
    });
  }, [savedLastPage, navigate]);
  const savedLoading =
    savedListPending ||
    savedLastPage !== null ||
    (savedView && savedResult?.key !== savedRequestKey);

  function showSaved(nextSaved: boolean) {
    if (!selectedList) return;
    if (nextSaved) {
      void navigate({
        search: (previous) => ({
          ...previous,
          saved: true,
          page: undefined,
          selectedTalent: undefined,
        }),
      });
      return;
    }
    // Back to everyone the saved search finds, with its own filters.
    void navigate({
      search: {
        ...listFiltersToTalentSearch(selectedList.filters),
        list: selectedList.id,
      },
    });
  }

  function showAllSaved() {
    if (!selectedList) return;
    void navigate({ search: { list: selectedList.id, saved: true } });
  }

  function changeMembership(
    candidateBoardUserId: string,
    change: TalentListMembershipChange,
  ) {
    setMemberships((current) => {
      const ids = new Set(current[candidateBoardUserId] ?? []);
      if (change.saved) ids.add(change.listId);
      else ids.delete(change.listId);
      return { ...current, [candidateBoardUserId]: [...ids] };
    });
    const delta = change.saved ? (change.created === false ? 0 : 1) : -1;
    if (delta !== 0) {
      setLists((current) =>
        current.map((list) =>
          list.id === change.listId
            ? { ...list, memberCount: Math.max(0, list.memberCount + delta) }
            : list,
        ),
      );
    }
    if (savedView && change.listId === selectedList?.id) {
      setSavedReload((current) => current + 1);
    }
  }

  function loadMemberships(candidateBoardUserId: string) {
    if (!workspace || memberships[candidateBoardUserId]) return;
    setMembershipsFailed((current) =>
      current.filter((id) => id !== candidateBoardUserId),
    );
    void listTalentListMemberships({
      data: { slug: workspace.slug, candidate: candidateBoardUserId },
    })
      .then((result) =>
        setMemberships((current) =>
          current[candidateBoardUserId]
            ? current
            : {
                ...current,
                [candidateBoardUserId]: (result.data ?? []).map(
                  (row) => row.listId,
                ),
              },
        ),
      )
      .catch(() =>
        setMembershipsFailed((current) => [...current, candidateBoardUserId]),
      );
  }

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
    resolveCustomFieldFilters(
      customFilterFields ?? [],
      pickCustomFieldSearch(search),
    ).length > 0,
  );
  const savedVms = useMemo(
    () =>
      (savedPage?.data ?? []).map((member) =>
        toTalentCardVM(member.candidate, getTalentSearchLabels(), {
          profileUnlocks,
        }),
      ),
    [savedPage, profileUnlocks],
  );
  const candidateVms = savedMode ? savedVms : candidates;
  function saveControl(
    candidateBoardUserId: string,
    presentation: 'icon' | 'default',
  ) {
    if (!workspace) return null;
    return (
      <TalentSaveToJob
        key={candidateBoardUserId}
        presentation={presentation}
        slug={workspace.slug}
        jobs={workspace.jobs}
        lists={lists}
        candidateBoardUserId={candidateBoardUserId}
        memberListIds={memberships[candidateBoardUserId]}
        membershipsFailed={membershipsFailed.includes(candidateBoardUserId)}
        savedHint={savedView}
        currentFilters={talentSearchToListFilters(search)}
        onOpen={() => loadMemberships(candidateBoardUserId)}
        onMembershipChange={(change) =>
          changeMembership(candidateBoardUserId, change)
        }
        onListCreated={(list) => setLists((current) => [...current, list])}
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
  const resultCount = savedMode ? (savedPage?.count ?? 0) : count;
  const resultPage = page;
  const resultPageSize = pageSize;
  const resultRange = {
    from: resultCount > 0 ? (resultPage - 1) * resultPageSize + 1 : 0,
    to: Math.min(resultPage * resultPageSize, resultCount),
    count: resultCount,
  };
  const hiddenSaved =
    savedPage && narrowsSavedPeople(search)
      ? Math.max(0, savedPage.total - savedPage.count)
      : 0;
  // The Saved view searches the same distance, so it keeps the control too.
  const radiusScope =
    placeRadius && onWithinChange ? (
      <SearchRadiusScope
        place={placeRadius.placeName}
        unit={placeRadius.radius.unit}
        within={placeRadius.radius.selected?.value ?? null}
        defaultWithin={placeRadius.radius.defaultOption.value}
        range={resultRange}
        sentences={TALENT_SEARCH_RADIUS_SENTENCES}
        onWithinChange={onWithinChange}
      />
    ) : null;
  const resultDescription =
    resultCount > 0 ? talentResultsShowingLine(resultRange, language) : null;
  const resultsBar = (
    <div data-slot="talent-results-bar" className="pb-3">
      <h1 className="text-foreground text-lg font-semibold tracking-tight">
        {m.talentSearch_resultsHeading()}
      </h1>
      {radiusScope ??
        (resultDescription ? (
          <p className="text-muted-foreground text-xs">{resultDescription}</p>
        ) : null)}
      {hiddenSaved > 0 && resultCount > 0 ? (
        <p className="text-muted-foreground text-xs">
          {m.talentSaved_hiddenByFilters({
            hidden: hiddenSaved,
            hiddenLabel: hiddenSaved.toLocaleString(language),
          })}{' '}
          <Button
            type="button"
            variant="link"
            size="inline"
            onClick={showAllSaved}
          >
            {m.talentSaved_showAllAction()}
          </Button>
        </p>
      ) : null}
    </div>
  );

  return (
    <Page width="wide" fill>
      <main
        data-layout="talent-search-page"
        className="md:flex md:h-full md:min-h-0 md:flex-col"
      >
        <Box border="bottom">
          <SearchResultsToolbar startAd={rails.startAd} endAd={rails.endAd}>
            <TalentFilters
              search={search}
              customFilterFields={customFilterFields}
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
              savedView={
                selectedList ? (
                  <TalentSavedViewControls
                    saved={savedView}
                    savedCount={selectedList.memberCount}
                    language={language}
                    stages={stages}
                    stage={stage}
                    onSavedChange={showSaved}
                    onStageChange={(stage) =>
                      void navigate({
                        search: (previous) => ({
                          ...previous,
                          stage,
                          page: undefined,
                          selectedTalent: undefined,
                        }),
                      })
                    }
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
                    onUpdated={(list) => {
                      setLists((current) =>
                        current.map((row) => (row.id === list.id ? list : row)),
                      );
                      // A stage belongs to the previously linked job.
                      if (search.stage && list.jobId !== selectedList.jobId) {
                        void navigate({
                          search: (previous) => ({
                            ...previous,
                            stage: undefined,
                          }),
                        });
                      }
                    }}
                  />
                ) : null
              }
            />
          </SearchResultsToolbar>
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
                  {savedMode &&
                  ((!savedShown && savedLoading) || savedLastPage !== null) ? (
                    <SavedPeoplePending />
                  ) : (
                    <Empty className="min-h-[calc(100dvh-16rem)] border-0">
                      {savedMode ? (
                        <SavedPeopleEmpty
                          state={
                            savedShown?.status === 'error' || !savedPage
                              ? 'error'
                              : savedPage.total === 0
                                ? 'none'
                                : 'filtered'
                          }
                          onShowAll={showAllSaved}
                          onRetry={() =>
                            setSavedReload((current) => current + 1)
                          }
                        />
                      ) : (
                        <>
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
                              <Link to="/talent" className={buttonVariants()}>
                                {m.jobSearch_resetFiltersAction()}
                              </Link>
                            </EmptyContent>
                          ) : null}
                        </>
                      )}
                    </Empty>
                  )}
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
                  aria-busy={savedMode && savedLoading ? true : undefined}
                  label={m.talentSearch_resultsRegionLabel()}
                  scrollRestorationId="talent-search-results"
                >
                  {resultsBar}

                  <InPlaceListingSelect onSelect={selection.onResultActivate}>
                    <ListingAdResults ads={ads}>
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
                    </ListingAdResults>
                  </InPlaceListingSelect>

                  {savedMode && !savedPage ? null : (
                    <ListingPagination
                      compact
                      page={page}
                      count={resultCount}
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

/** First load of a Saved view: card-shaped placeholders, no live content. */
function SavedPeoplePending() {
  return (
    <div role="status" className="space-y-3">
      <span className="sr-only">{m.talentSaved_loadingLabel()}</span>
      {[0, 1, 2].map((row) => (
        <Skeleton
          key={row}
          className="h-24 w-full motion-reduce:animate-none"
        />
      ))}
    </div>
  );
}

function SavedPeopleEmpty({
  state,
  onShowAll,
  onRetry,
}: {
  /** Nobody saved yet, filters hide everyone saved, or the read failed. */
  state: 'none' | 'filtered' | 'error';
  onShowAll: () => void;
  onRetry: () => void;
}) {
  return (
    <>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Bookmark aria-hidden="true" />
        </EmptyMedia>
        {state === 'error' ? (
          <EmptyTitle>{m.talentSaved_errorText()}</EmptyTitle>
        ) : (
          <>
            <EmptyTitle>
              {state === 'none'
                ? m.talentSaved_emptyTitle()
                : m.talentSaved_noMatchTitle()}
            </EmptyTitle>
            <EmptyDescription>
              {state === 'none'
                ? m.talentSaved_emptyText()
                : m.talentSaved_noMatchText()}
            </EmptyDescription>
          </>
        )}
      </EmptyHeader>
      {state === 'none' ? null : (
        <EmptyContent>
          <Button
            type="button"
            onClick={state === 'filtered' ? onShowAll : onRetry}
          >
            {state === 'filtered'
              ? m.talentSaved_showAllAction()
              : m.talentSearch_retryLabel()}
          </Button>
        </EmptyContent>
      )}
    </>
  );
}

/** The "Showing …" line under a talent results heading. */
export function talentResultsShowingLine(
  span: ResultsSpan,
  locale: string,
): string {
  return resultsShowingLine(span, locale, {
    single: ({ count, countLabel }) =>
      m.talentSearch_resultsShowingCount({ count, countLabel }),
    lastPage: ({ to, count, countLabel }) =>
      m.talentSearch_resultsShowingLast({ to, count, countLabel }),
    range: ({ from, to, countLabel }) =>
      m.talentSearch_resultsShowingRange({ from, to, count: countLabel }),
  });
}
