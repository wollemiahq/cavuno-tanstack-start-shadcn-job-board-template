'use client';

import { useSyncExternalStore } from 'react';

import {
  clockTime,
  daySeparator,
  relativeTime,
} from '../../lib/message-format';

type DatePresentation = 'clock' | 'day' | 'relative';

const subscribe = () => () => undefined;

function serverFallback(iso: string, presentation: DatePresentation) {
  const date = new Date(iso);
  if (presentation === 'clock') {
    return `${date.toISOString().slice(11, 16)} UTC`;
  }
  return date.toISOString().slice(0, 10);
}

export function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

export function HydrationSafeDate({
  iso,
  presentation,
  now,
  children,
}: {
  iso: string;
  presentation: DatePresentation;
  now?: number;
  children?: (formatted: string) => React.ReactNode;
}) {
  const hydrated = useHydrated();
  const formatted = hydrated
    ? presentation === 'clock'
      ? clockTime(iso)
      : presentation === 'day'
        ? daySeparator(iso, now)
        : relativeTime(iso, now)
    : serverFallback(iso, presentation);

  return children ? children(formatted) : formatted;
}
