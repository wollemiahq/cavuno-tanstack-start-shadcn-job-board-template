'use client';

import { useEffect, useRef } from 'react';

import { analytics } from '@cavuno/board/analytics';

import { isWorkingPreviewHostname } from './analytics-preview';
import { useCookieConsent } from './cookie-consent';

import {
  captureBrowserAudienceAttribution,
  clearBrowserAudienceAttribution,
} from '@/lib/audience-attribution';

type InstallAnalytics = (options: { publishableKey: string }) => void;

function installBoardAnalytics(options: { publishableKey: string }) {
  analytics.install(options);
}

/**
 * Boots Cavuno Analytics once per document. Publishable key comes from
 * the public board shell (same pk_ as Board API). When the board requires
 * cookie consent, the tracker loads only after an explicit accept. A later
 * decline withdraws it (see CookieConsentProvider); reopening "Cookie
 * preferences" alone does not.
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
  const { required, choice, markAnalyticsLoaded } = useCookieConsent();
  const entry = useRef<{ href: string; referrer: string } | null>(null);
  // Unresolved (`undefined`) and denied/undecided are not allowed yet.
  const allowed = !required || choice === 'accepted';
  useEffect(() => {
    if (isWorkingPreviewHostname(hostname ?? window.location.hostname)) return;
    if (!publishableKey.startsWith('pk_')) return;
    // Snapshot the landing page while a consent decision is still pending.
    entry.current ??= {
      href: window.location.href,
      referrer: document.referrer,
    };
    if (choice === undefined) return;
    if (choice === 'denied' || (required && choice !== 'accepted')) {
      clearBrowserAudienceAttribution(publishableKey);
      return;
    }
    captureBrowserAudienceAttribution(publishableKey, entry.current);
  }, [publishableKey, hostname, required, choice]);

  useEffect(() => {
    if (isWorkingPreviewHostname(hostname ?? window.location.hostname)) return;
    if (!publishableKey.startsWith('pk_')) return;
    if (!allowed) return;
    install({ publishableKey });
    markAnalyticsLoaded();
  }, [publishableKey, install, markAnalyticsLoaded, hostname, allowed]);

  return null;
}
