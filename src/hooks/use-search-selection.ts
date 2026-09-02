'use client';

import { useEffect, useRef } from 'react';
import type { MouseEvent as ReactMouseEvent, RefObject } from 'react';

import { useDesktopMedia } from '@/hooks/use-desktop-media';

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
  const isDesktop = useDesktopMedia();
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

  // On ARRIVAL with a URL-selected row that is clipped in the list (deep
  // link to a card below the fold), align it inside the LIST's own overflow
  // — ONCE. A row that is already fully visible must not move: header-nav
  // auto-selects the first result, and forcing that card to the list top
  // clips the "Candidates" / "N jobs" heading above it.
  //
  // Do not use `scrollIntoView`: with a sticky site header it walks up to
  // the window and lands the listing mid-page. Instant jump, reduced-motion-safe.
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
    const listRect = list.getBoundingClientRect();
    const rowRect = row.getBoundingClientRect();
    if (rowRect.top >= listRect.top && rowRect.bottom <= listRect.bottom) {
      return;
    }
    list.scrollTo({
      top: list.scrollTop + (rowRect.top - listRect.top),
    });
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
