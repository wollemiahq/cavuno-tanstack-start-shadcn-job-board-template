'use client';

import { useEffect } from 'react';

import { analytics } from '@/lib/board-analytics';

/**
 * Boots Cavuno Analytics once per document. Publishable key comes from
 * the public board shell (same pk_ as Board API).
 */
export function BoardAnalyticsBoot({
  publishableKey,
}: {
  publishableKey: string;
}) {
  useEffect(() => {
    if (!publishableKey.startsWith('pk_')) return;
    analytics.install({ publishableKey });
  }, [publishableKey]);

  return null;
}
