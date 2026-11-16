'use client';

import { useCallback, useSyncExternalStore } from 'react';

/**
 * The company an employer last opened, so the header keeps pointing at it on
 * pages without a company in the URL. Only the public company slug is kept,
 * in this browser; the header checks it against the viewer's memberships.
 */
const STORAGE_KEY = 'cavuno:last-employer-company';

const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  window.addEventListener('storage', callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener('storage', callback);
  };
}

// `localStorage` throws when storage is blocked and is null in an Android
// WebView without DOM storage; both mean nothing is remembered.
function getSnapshot(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function getServerSnapshot(): string | null {
  return null;
}

/** The remembered company slug, and a setter for the company just opened. */
export function useLastEmployerCompany(): [
  string | null,
  (slug: string) => void,
] {
  const slug = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const remember = useCallback((next: string) => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === next) return;
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      return;
    }
    for (const listener of listeners) listener();
  }, []);
  return [slug, remember];
}
