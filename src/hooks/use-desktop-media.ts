'use client';

import { useSyncExternalStore } from 'react';

/** Canonical master–detail desktop gate. Same string as Tailwind `md` / 48rem. */
export const DESKTOP_MEDIA_QUERY = '(min-width: 48rem)' as const;

function subscribeToDesktop(callback: () => void) {
  try {
    const media = window.matchMedia(DESKTOP_MEDIA_QUERY);
    media.addEventListener('change', callback);
    return () => media.removeEventListener('change', callback);
  } catch {
    return () => {};
  }
}

function getDesktopSnapshot() {
  try {
    return window.matchMedia(DESKTOP_MEDIA_QUERY).matches;
  } catch {
    return false;
  }
}

function getServerDesktopSnapshot() {
  return false;
}

/** Live `matchMedia` for the master–detail desktop gate. SSR snapshot is false. */
export function useDesktopMedia(): boolean {
  return useSyncExternalStore(
    subscribeToDesktop,
    getDesktopSnapshot,
    getServerDesktopSnapshot,
  );
}
