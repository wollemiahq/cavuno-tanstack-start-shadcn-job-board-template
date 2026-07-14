'use client';

import { useEffect, useRef } from 'react';

/**
 * Poll a callback on an interval while the tab is visible — the ADR-0053 REST
 * transport for messaging (no sockets, no SSE in v1). Uses a recursive
 * `setTimeout` (not `setInterval`) so a slow tick never stacks, pauses while
 * the tab is hidden to avoid background churn, and fires an immediate refresh
 * when the tab becomes visible again so a returning user isn't stale.
 */
export function useVisiblePoll(callback: () => void, intervalMs = 4000) {
  const savedCallback = useRef(callback);
  savedCallback.current = callback;

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;

    const tick = () => {
      if (stopped) return;
      if (typeof document === 'undefined' || !document.hidden) {
        savedCallback.current();
      }
      timer = setTimeout(tick, intervalMs);
    };

    const onVisibility = () => {
      if (!document.hidden) savedCallback.current();
    };

    timer = setTimeout(tick, intervalMs);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [intervalMs]);
}
