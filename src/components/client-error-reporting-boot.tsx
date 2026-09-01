'use client';

import { useEffect } from 'react';

import { useClientErrorReport } from '@/lib/use-client-error-report';

/**
 * Idle-installs window error listeners after first paint so the happy path
 * pays no network and almost no JS (this file is a few lines; the listener
 * module loads idle). Route errorComponents still report immediately.
 */
export function ClientErrorReportingBoot() {
  useEffect(() => {
    const win = window as Window & {
      requestIdleCallback?: (cb: () => void) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    const schedule = win.requestIdleCallback
      ? (cb: () => void) => win.requestIdleCallback!(cb)
      : (cb: () => void) => window.setTimeout(cb, 1);
    const cancel = win.cancelIdleCallback
      ? (id: number) => win.cancelIdleCallback!(id)
      : (id: number) => window.clearTimeout(id);

    const id = schedule(() => {
      void import('@/lib/install-client-error-reporting').then((mod) => {
        mod.installClientErrorReporting();
      });
    });
    return () => cancel(id);
  }, []);

  return null;
}

/** Mount inside a route errorComponent (server or client). */
export function ClientErrorReporter({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useClientErrorReport(error);
  return null;
}
