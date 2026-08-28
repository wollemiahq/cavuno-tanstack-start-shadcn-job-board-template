'use client';

import { useEffect } from 'react';

import { useBoardConversionAnalytics } from '@/components/board-conversion-analytics';
import {
  parseAuthConversionSearchParams,
  pushBoardDataLayerEvent,
  stripAuthConversionSearchParams,
  type BoardAuthEvent,
  type BoardAuthMethod,
} from '@/lib/board-datalayer-events';
import {
  fireBoardPixelConversion,
  pushBoardConversionEvent,
} from '@/lib/board-pixel-conversions';

/**
 * Parse `cavuno_auth*` query params on any landing page, fire the matching
 * conversion, then strip the params with `history.replaceState`.
 */
export function BoardAuthConversionTracker() {
  const ctx = useBoardConversionAnalytics();

  useEffect(() => {
    if (!ctx || typeof window === 'undefined') return;
    const search = new URLSearchParams(window.location.search);
    const parsed = parseAuthConversionSearchParams(search);
    if (!parsed) return;

    pushBoardConversionEvent(ctx.analytics, {
      event: parsed.event,
      method: parsed.method,
      board_slug: ctx.boardSlug,
    });

    const nextSearch = stripAuthConversionSearchParams(search);
    const nextUrl = `${window.location.pathname}${nextSearch}${window.location.hash}`;
    window.history.replaceState(window.history.state, '', nextUrl);
  }, [ctx]);

  return null;
}

/** Imperative helper for auth flows that fire before navigation. */
export function trackBoardAuthConversion(
  analytics: Parameters<typeof fireBoardPixelConversion>[0],
  boardSlug: string,
  event: BoardAuthEvent,
  method: BoardAuthMethod,
) {
  pushBoardConversionEvent(analytics, {
    event,
    method,
    board_slug: boardSlug,
  });
}

/** Test hook — dataLayer-only push without pixels. */
export function pushAuthDataLayerOnly(
  boardSlug: string,
  event: BoardAuthEvent,
  method: BoardAuthMethod,
) {
  pushBoardDataLayerEvent({ event, method, board_slug: boardSlug });
}
