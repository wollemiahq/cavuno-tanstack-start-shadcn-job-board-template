'use client';

import { useEffect } from 'react';

import { useCookieConsent } from '@/components/cookie-consent';
import { flushBoardPixelQueue } from '@/lib/board-pixel-conversions';
import { startWebVitalsReporting } from '@/lib/web-vitals';

/** The board context's `analytics` group, minus the consent flag. */
export interface BoardAnalyticsConfig {
  ga4MeasurementId: string | null;
  gtmId: string | null;
  metaPixelId: string | null;
  linkedInPartnerId: string | null;
}

interface VendorScript {
  /** DOM-id stem — the injection guard and the test hook. */
  key: string;
  /** Inline bootstrap executed before (or instead of) the loader. */
  inline?: string;
  /** External loader src. */
  src?: string;
  /** Called after the loader script element is appended. */
  onLoaderReady?: () => void;
}

/**
 * Host-scoped GA4 cookies (MIG-11): never let `_ga` default to a parent
 * domain like `.cavuno.app` on custom board domains.
 */
function ga4ConfigSnippet(measurementId: string): string {
  const id = JSON.stringify(measurementId);
  const hostname = JSON.stringify(
    typeof window !== 'undefined' ? window.location.hostname : 'localhost',
  );
  return (
    'window.dataLayer=window.dataLayer||[];' +
    'window.gtag=window.gtag||function(){window.dataLayer.push(arguments);};' +
    "window.gtag('js',new Date());" +
    `window.gtag('config',${id},{cookie_domain:${hostname},cookie_flags:'SameSite=Lax;Secure'});`
  );
}

/**
 * The operator's tracker IDs come from the board's own trusted API config,
 * but they are still interpolated into executable script text — always via
 * JSON.stringify so a quote can never break out of the string literal.
 */
function vendorScripts(analytics: BoardAnalyticsConfig): VendorScript[] {
  const scripts: VendorScript[] = [];

  if (analytics.gtmId) {
    scripts.push({
      key: 'gtm',
      inline:
        'window.dataLayer=window.dataLayer||[];' +
        "window.dataLayer.push({'gtm.start':new Date().getTime(),event:'gtm.js'});",
      src: `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(analytics.gtmId)}`,
      onLoaderReady: flushBoardPixelQueue,
    });
  }

  if (analytics.ga4MeasurementId) {
    scripts.push({
      key: 'ga4',
      inline: ga4ConfigSnippet(analytics.ga4MeasurementId),
      src: `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(analytics.ga4MeasurementId)}`,
      onLoaderReady: flushBoardPixelQueue,
    });
  }

  if (analytics.metaPixelId) {
    const id = JSON.stringify(analytics.metaPixelId);
    scripts.push({
      key: 'meta-pixel',
      // The canonical fbq stub, minus its DOM insertion (the loader is a
      // separate element below, so the stub never touches the DOM itself).
      inline:
        '!function(f){if(f.fbq)return;var n=f.fbq=function(){n.callMethod?' +
        'n.callMethod.apply(n,arguments):n.queue.push(arguments)};' +
        "f._fbq||(f._fbq=n);n.push=n;n.loaded=!0;n.version='2.0';n.queue=[]}(window);" +
        `window.fbq('init',${id});window.fbq('track','PageView');`,
      src: 'https://connect.facebook.net/en_US/fbevents.js',
      onLoaderReady: flushBoardPixelQueue,
    });
  }

  if (analytics.linkedInPartnerId) {
    const id = JSON.stringify(analytics.linkedInPartnerId);
    scripts.push({
      key: 'linkedin',
      inline:
        `window._linkedin_partner_id=${id};` +
        'window._linkedin_data_partner_ids=window._linkedin_data_partner_ids||[];' +
        `window._linkedin_data_partner_ids.push(${id});` +
        'window.lintrk=window.lintrk||function(a,b){window.lintrk.q.push([a,b])};' +
        'window.lintrk.q=window.lintrk.q||[];',
      src: 'https://snap.licdn.com/li.lms-analytics/insight.min.js',
      onLoaderReady: flushBoardPixelQueue,
    });
  }

  return scripts;
}

function injectVendorScripts(analytics: BoardAnalyticsConfig) {
  for (const vendor of vendorScripts(analytics)) {
    const inlineId = `cavuno-analytics-${vendor.key}`;
    const loaderId = `cavuno-analytics-${vendor.key}-loader`;
    // DOM-presence guard (not module state) keeps injection idempotent
    // across re-renders while staying resettable in tests.
    if (vendor.inline && !document.getElementById(inlineId)) {
      const inline = document.createElement('script');
      inline.id = inlineId;
      inline.textContent = vendor.inline;
      document.head.appendChild(inline);
    }
    if (vendor.src && !document.getElementById(loaderId)) {
      const loader = document.createElement('script');
      loader.id = loaderId;
      loader.async = true;
      loader.src = vendor.src;
      if (vendor.onLoaderReady) {
        loader.addEventListener('load', vendor.onLoaderReady, { once: true });
      }
      document.head.appendChild(loader);
    }
  }
  // Inline stubs (Meta/LinkedIn) may already be callable before loaders finish.
  flushBoardPixelQueue();
}

/**
 * Injects the board's configured trackers (GTM, GA4, Meta Pixel, LinkedIn
 * Insight) client-side. When the board requires cookie consent, injection
 * waits for an explicit accept — a deny (or no choice yet) loads nothing.
 * Scripts already loaded in this document stay until the next navigation;
 * a later revocation applies from the next page load.
 */
export function AnalyticsScripts({
  analytics,
  reportWebVitals = startWebVitalsReporting,
}: {
  analytics: BoardAnalyticsConfig;
  reportWebVitals?: () => Promise<void>;
}) {
  const { required, choice } = useCookieConsent();
  // Unresolved (`undefined`) and denied/undecided are not allowed yet.
  const allowed = !required || choice === 'accepted';

  useEffect(() => {
    if (!allowed) return;
    injectVendorScripts(analytics);
    void reportWebVitals();
  }, [allowed, analytics, reportWebVitals]);

  return null;
}
