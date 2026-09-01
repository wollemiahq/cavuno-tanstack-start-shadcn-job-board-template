'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';
import type { MouseEvent as ReactMouseEvent, RefObject } from 'react';

const DESKTOP_QUERY = '(min-width: 48rem)';

function subscribeToDesktop(callback: () => void) {
  const media = window.matchMedia(DESKTOP_QUERY);
  media.addEventListener('change', callback);
  return () => media.removeEventListener('change', callback);
}

function getDesktopSnapshot() {
  return window.matchMedia(DESKTOP_QUERY).matches;
}

function getServerDesktopSnapshot() {
  return false;
}

export interface SearchSelectionController {
  isDesktop: boolean;
  selectedId?: string;
  detailRef: RefObject<HTMLElement | null>;
  /** The scrolling list region — attached so an arrival selection can align. */
  listRef: RefObject<HTMLElement | null>;
  onResultActivate: (
    event: ReactMouseEvent<HTMLAnchorElement>,
    resultId: string,
  ) => void;
}

export function useSearchSelection({
  selectedId,
  resultIds,
  page,
  onReplace,
  onPush,
}: {
  selectedId?: string;
  resultIds: string[];
  /**
   * Listing page index. When it changes, the master list scroll container
   * resets to the top so pagination (Next/Previous) never lands mid-list.
   * Selection-only URL changes must omit a page change so the list keeps its
   * place — the core master–detail interaction.
   */
  page?: number;
  onReplace: (resultId: string) => void;
  onPush: (resultId: string) => void;
}): SearchSelectionController {
  const isDesktop = useSyncExternalStore(
    subscribeToDesktop,
    getDesktopSnapshot,
    getServerDesktopSnapshot,
  );
  const detailRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLElement>(null);
  const selectedIsVisible = selectedId ? resultIds.includes(selectedId) : false;
  const activeId = isDesktop
    ? selectedIsVisible
      ? selectedId
      : resultIds[0]
    : undefined;
  const previousActiveId = useRef(activeId);
  // Seeded with the mount page so the initial render never scrolls the list —
  // only a subsequent page change does.
  const previousPage = useRef(page);

  useEffect(() => {
    if (activeId && activeId !== selectedId) onReplace(activeId);
  }, [activeId, onReplace, selectedId]);

  useEffect(() => {
    const previousId = previousActiveId.current;
    previousActiveId.current = activeId;

    if (previousId && activeId && previousId !== activeId) {
      detailRef.current?.scrollTo({ top: 0 });
    }
  }, [activeId]);

  // Pagination lands a fresh result window in the same overflow container that
  // still holds the previous page's scrollTop. Reset the list on page change
  // only — never on selection-only updates. useEffect (not layout) so this
  // runs after TanStack's onRendered scroll-restoration useLayoutEffect, which
  // would otherwise re-apply the prior location's element scroll.
  useEffect(() => {
    if (page === undefined || previousPage.current === page) return;
    previousPage.current = page;
    const list = listRef.current;
    // `scrollTo` is incomplete in some non-browser runtimes (jsdom) — guard
    // so the reset degrades to a no-op rather than throwing.
    if (list?.scrollTo instanceof Function) {
      list.scrollTo({ top: 0 });
    }
  }, [page]);

  // On ARRIVAL with a URL-selected row (e.g. from a homepage card), bring it
  // to the top of the LIST's own overflow — ONCE, and only for the initial
  // URL selection. Later in-page clicks must never yank a visible row away.
  //
  // Do not use `scrollIntoView`: with a sticky site header it walks up to
  // the window and lands the listing mid-page (talent has no filter bar
  // above the split, so this is visible there even when jobs/companies
  // look fine). Instant jump, reduced-motion-safe.
  const didArrivalScroll = useRef(false);
  useEffect(() => {
    if (didArrivalScroll.current || !isDesktop) return;
    // Wait until the list has rendered its rows before deciding.
    if (resultIds.length === 0) return;
    // Mark the arrival window closed no matter what, so a later manual
    // selection (which sets `selectedId` after mount) never triggers a scroll.
    didArrivalScroll.current = true;
    // The arrived row may legitimately be absent from this page (the detail
    // pane fetches it independently) — then there is no row to align, no-op.
    if (!selectedId || !resultIds.includes(selectedId)) return;
    const list = listRef.current;
    if (!list || !(list.scrollTo instanceof Function)) return;
    const rows = list.querySelectorAll<HTMLElement>('[data-result-id]');
    const row = Array.from(rows).find(
      (el) => el.dataset.resultId === selectedId,
    );
    if (!row) return;
    const delta =
      row.getBoundingClientRect().top - list.getBoundingClientRect().top;
    list.scrollTo({ top: list.scrollTop + delta });
  }, [isDesktop, selectedId, resultIds]);

  return {
    isDesktop,
    selectedId: activeId,
    detailRef,
    listRef,
    onResultActivate: (event, resultId) => {
      if (
        !isDesktop ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      event.preventDefault();
      if (resultId === selectedId) return;

      onPush(resultId);
    },
  };
}
