'use client';

import { useSyncExternalStore } from 'react';

import {
  clockTime,
  daySeparator,
  relativeTime,
} from '../../lib/message-format';
import { getLocale } from '../../paraglide/runtime';

type DatePresentation = 'clock' | 'day' | 'relative';

const subscribe = () => () => undefined;

function serverFallback(iso: string, presentation: DatePresentation) {
  // Pre-hydration frame: pin to UTC so server and first client paint agree
  // regardless of host timezone — but FORMAT with Intl in the viewer's
  // locale (the old frame hardcoded `HH:MM UTC` and ISO dates in English
  // conventions).
  const date = new Date(iso);
  try {
    if (presentation === 'clock') {
      return new Intl.DateTimeFormat(getLocale(), {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'UTC',
        timeZoneName: 'short',
      }).format(date);
    }
    return new Intl.DateTimeFormat(getLocale(), {
      dateStyle: 'medium',
      timeZone: 'UTC',
    }).format(date);
  } catch {
    if (presentation === 'clock') {
      return `${date.toISOString().slice(11, 16)} UTC`;
    }
    return date.toISOString().slice(0, 10);
  }
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
