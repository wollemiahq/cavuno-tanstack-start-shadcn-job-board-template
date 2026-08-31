'use client';

import { useEffect } from 'react';

import { analytics } from '@cavuno/board/analytics';

type InstallAnalytics = (options: { publishableKey: string }) => void;

function installBoardAnalytics(options: { publishableKey: string }) {
  analytics.install(options);
}

/**
 * Boots Cavuno Analytics once per document. Publishable key comes from
 * the public board shell (same pk_ as Board API).
 */
export function BoardAnalyticsBoot({
  publishableKey,
  install = installBoardAnalytics,
}: {
  publishableKey: string;
  install?: InstallAnalytics;
}) {
  useEffect(() => {
    if (!publishableKey.startsWith('pk_')) return;
    install({ publishableKey });
  }, [publishableKey, install]);

  return null;
}
