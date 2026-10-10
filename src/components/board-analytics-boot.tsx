'use client';

import { useEffect, useRef } from 'react';

import { analytics } from '@cavuno/board/analytics';

import { isWorkingPreviewHostname } from './analytics-preview';
import { useCookieConsent } from './cookie-consent';

import { exposeAnalyticsCanonicalPathname } from '@/lib/analytics-canonical-path';
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
  const { required, choice, consentSource, allowed, markAnalyticsLoaded } =
    useCookieConsent();
  const entry = useRef<{ href: string; referrer: string } | null>(null);
  useEffect(() => {
    if (isWorkingPreviewHostname(hostname ?? window.location.hostname)) return;
    if (!publishableKey.startsWith('pk_')) return;
    // Snapshot the landing page while a consent decision is still pending.
    entry.current ??= {
      href: window.location.href,
      referrer: document.referrer,
    };
    // Not known yet: our choice unresolved, or waiting for Google's CMP.
    if (consentSource === 'pending') return;
    if (consentSource === 'cavuno' && choice === undefined) return;
    const declined =
      consentSource === 'google'
        ? !allowed
        : choice === 'denied' || (required && choice !== 'accepted');
    if (declined) {
      clearBrowserAudienceAttribution(publishableKey);
      return;
    }
    captureBrowserAudienceAttribution(publishableKey, entry.current);
  }, [publishableKey, hostname, required, choice, consentSource, allowed]);

  useEffect(() => {
    if (isWorkingPreviewHostname(hostname ?? window.location.hostname)) return;
    if (!publishableKey.startsWith('pk_')) return;
    if (!allowed) return;
    // The analytics script only loads through `install`; defining the
    // pathname mapper first means it exists before the script can send.
    exposeAnalyticsCanonicalPathname();
    install({ publishableKey });
    markAnalyticsLoaded();
  }, [publishableKey, install, markAnalyticsLoaded, hostname, allowed]);

  return null;
}
