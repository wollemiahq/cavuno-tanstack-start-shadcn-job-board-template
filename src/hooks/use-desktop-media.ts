'use client';

import { useSyncExternalStore } from 'react';

/** Canonical master–detail desktop gate. Same string as Tailwind `md` / 48rem. */
export const DESKTOP_MEDIA_QUERY = '(min-width: 48rem)' as const;

function subscribeToDesktop(callback: () => void) {
  if (typeof window.matchMedia !== 'function') return () => {};
  const media = window.matchMedia(DESKTOP_MEDIA_QUERY);
  media.addEventListener('change', callback);
  return () => media.removeEventListener('change', callback);
}

function getDesktopSnapshot() {
  if (typeof window.matchMedia !== 'function') return false;
  return window.matchMedia(DESKTOP_MEDIA_QUERY).matches;
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
