'use client';

import { useEffect, useRef } from 'react';

import { useBoardConversionAnalytics } from '@/components/board-conversion-analytics';
import { pushBoardConversionEvent } from '@/lib/board-pixel-conversions';

/** Fire `job_alert_subscribe` once when double opt-in confirms a new alert. */
export function BoardJobAlertConversionTracker({
  status,
}: {
  status: 'confirmed' | 'already_confirmed' | 'expired' | 'not_found';
}) {
  const ctx = useBoardConversionAnalytics();
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current || !ctx || status !== 'confirmed') return;
    fired.current = true;
    pushBoardConversionEvent(ctx.analytics, {
      event: 'job_alert_subscribe',
      board_slug: ctx.boardSlug,
      source: 'confirm',
    });
  }, [ctx, status]);

  return null;
}
