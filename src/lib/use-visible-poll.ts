'use client';

import { useEffect, useRef } from 'react';

/**
 * Poll a callback on an interval while the tab is visible — the REST
 * transport for messaging (no sockets, no SSE in v1). Uses a recursive
 * `setTimeout` (not `setInterval`) so a slow tick never stacks, pauses while
 * the tab is hidden to avoid background churn, and fires an immediate refresh
 * when the tab becomes visible again so a returning user isn't stale.
 */
export function useVisiblePoll(
  callback: () => void | Promise<void>,
  intervalMs = 4000,
  enabled = true,
  immediate = false,
) {
  const savedCallback = useRef(callback);
  savedCallback.current = callback;

  useEffect(() => {
    if (!enabled) return;
    const visibleDocument = globalThis.document;
    if (!visibleDocument) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    let inFlight = false;
    let refreshAfterFlight = false;

    const schedule = () => {
      if (stopped) return;
      timer = setTimeout(() => {
        timer = undefined;
        void run();
      }, intervalMs);
    };

    const run = async () => {
      if (stopped || inFlight) return;
      if (visibleDocument.hidden) {
        schedule();
        return;
      }
      inFlight = true;
      try {
        await savedCallback.current();
      } catch {
        // Polling callers own visible error state; one rejection must not stop
        // later refreshes.
      } finally {
        inFlight = false;
        if (refreshAfterFlight && !visibleDocument.hidden) {
          refreshAfterFlight = false;
          void run();
        } else {
          refreshAfterFlight = false;
          schedule();
        }
      }
    };

    const onVisibility = () => {
      if (visibleDocument.hidden) return;
      if (inFlight) {
        refreshAfterFlight = true;
        return;
      }
      if (timer) clearTimeout(timer);
      timer = undefined;
      void run();
    };

    if (immediate) void run();
    else schedule();
    visibleDocument.addEventListener('visibilitychange', onVisibility);

    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      visibleDocument.removeEventListener('visibilitychange', onVisibility);
    };
  }, [enabled, immediate, intervalMs]);
}
