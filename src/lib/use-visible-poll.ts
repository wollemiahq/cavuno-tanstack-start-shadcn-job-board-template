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

    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    let inFlight = false;

    const schedule = () => {
      if (stopped) return;
      timer = setTimeout(() => {
        timer = undefined;
        void run();
      }, intervalMs);
    };

    const run = async () => {
      if (stopped || inFlight) return;
      if (typeof document !== 'undefined' && document.hidden) {
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
        schedule();
      }
    };

    const onVisibility = () => {
      if (document.hidden) return;
      if (timer) clearTimeout(timer);
      timer = undefined;
      void run();
    };

    if (immediate) void run();
    else schedule();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [enabled, immediate, intervalMs]);
}
