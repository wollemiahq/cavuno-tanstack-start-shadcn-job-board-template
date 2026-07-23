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
  onReplace,
  onPush,
}: {
  selectedId?: string;
  resultIds: string[];
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

  // On ARRIVAL with a URL-selected job (e.g. from a homepage card), bring its
  // row to the top of the list's own scroll container — ONCE, and only for the
  // initial URL selection. Later in-page clicks must never yank a visible row
  // away. Instant jump (no smooth-scroll), so it is reduced-motion-safe.
  const didArrivalScroll = useRef(false);
  useEffect(() => {
    if (didArrivalScroll.current || !isDesktop) return;
    // Wait until the list has rendered its rows before deciding.
    if (resultIds.length === 0) return;
    // Mark the arrival window closed no matter what, so a later manual
    // selection (which sets `selectedId` after mount) never triggers a scroll.
    didArrivalScroll.current = true;
    // The arrived job may legitimately be absent from this page (the detail
    // pane fetches it independently) — then there is no row to align, no-op.
    if (!selectedId || !resultIds.includes(selectedId)) return;
    const rows =
      listRef.current?.querySelectorAll<HTMLElement>('[data-result-id]');
    const row = rows
      ? Array.from(rows).find((el) => el.dataset.resultId === selectedId)
      : undefined;
    // `scrollIntoView` is absent in some non-browser runtimes (jsdom) — guard
    // so the arrival alignment degrades to a no-op rather than throwing.
    if (typeof row?.scrollIntoView === 'function') {
      row.scrollIntoView({ block: 'start' });
    }
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
