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
 * The loaded tracker has no off switch and keeps beaconing for the life of
 * the document, so withdrawing consent drops its session cookie (host-only,
 * Path=/) and reloads into a document that never loads it.
 */
function withdrawBoardAnalytics() {
  document.cookie = 'session-id=; Path=/; Max-Age=0';
  window.location.reload();
}

/**
 * Boots Cavuno Analytics once per document. Publishable key comes from
 * the public board shell (same pk_ as Board API). When the board requires
 * cookie consent, the tracker loads only after an explicit accept; a later
 * deny or "Cookie preferences" reopen withdraws it.
 */
export function BoardAnalyticsBoot({
  publishableKey,
  install = installBoardAnalytics,
  withdraw = withdrawBoardAnalytics,
  hostname,
}: {
  publishableKey: string;
  install?: InstallAnalytics;
  /** Test seam; runtime clears the tracker cookie and reloads. */
  withdraw?: () => void;
  /** Test seam; runtime defaults to the current document host. */
  hostname?: string;
}) {
  const { required, choice } = useCookieConsent();
  const entry = useRef<{ href: string; referrer: string } | null>(null);
  const installed = useRef(false);
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
    if (allowed) {
      install({ publishableKey });
      installed.current = true;
    } else if (installed.current) {
      installed.current = false;
      withdraw();
    }
  }, [publishableKey, install, withdraw, hostname, allowed]);

  return null;
}
