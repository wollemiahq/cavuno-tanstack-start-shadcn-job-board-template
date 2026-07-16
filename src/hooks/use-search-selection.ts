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

  return {
    isDesktop,
    selectedId: activeId,
    detailRef,
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
