'use client';

import { useEffect } from 'react';

import { analytics } from '@cavuno/board/analytics';

import { isWorkingPreviewHostname } from './analytics-preview';

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
  hostname,
}: {
  publishableKey: string;
  install?: InstallAnalytics;
  /** Test seam; runtime defaults to the current document host. */
  hostname?: string;
}) {
  useEffect(() => {
    if (isWorkingPreviewHostname(hostname ?? window.location.hostname)) return;
    if (!publishableKey.startsWith('pk_')) return;
    install({ publishableKey });
  }, [publishableKey, install, hostname]);

  return null;
}
