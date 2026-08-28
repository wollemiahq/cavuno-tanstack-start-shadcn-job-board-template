// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
/**
 * Analytics injection behavior: trackers inject freely on consent-free
 * boards, and on consent-required boards only after an explicit accept —
 * never while undecided or denied. Tracker IDs reach the script text only
 * through JSON.stringify/encodeURIComponent.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AnalyticsScripts } from './analytics-scripts';
import { CookieConsentProvider, useCookieConsent } from './cookie-consent';

import type { BoardAnalyticsConfig } from './analytics-scripts';
import { COOKIE_CONSENT_COOKIE } from '@/lib/cookie-consent';

const startWebVitalsReporting = vi.fn<() => Promise<void>>();

const STORAGE_KEY = 'cavuno:cookie-consent';

const analytics: BoardAnalyticsConfig = {
  ga4MeasurementId: 'G-TEST123',
  gtmId: 'GTM-TEST',
  metaPixelId: '1234567890',
  linkedInPartnerId: '54321',
};

const VENDOR_KEYS = ['gtm', 'ga4', 'meta-pixel', 'linkedin'] as const;

interface GtmStartEvent {
  'gtm.start': number;
  event: string;
}

type AnalyticsDataLayerEntry = IArguments | GtmStartEvent | Record<string, unknown>;

declare global {
  interface Window {
    dataLayer?: AnalyticsDataLayerEntry[];
    gtag?: (...args: unknown[]) => void;
    fbq?: ((...args: unknown[]) => void) & { queue?: IArguments[] };
    _fbq?: Window['fbq'];
    _linkedin_partner_id?: string;
    _linkedin_data_partner_ids?: string[];
    lintrk?: (args: Record<string, unknown>) => void;
  }
}

function isGtmStartEvent(
  entry: AnalyticsDataLayerEntry,
): entry is GtmStartEvent {
  return (
    typeof entry === 'object' &&
    entry !== null &&
    !Array.isArray(entry) &&
    Object.hasOwn(entry, 'gtm.start')
  );
}

const injectedKeys = () =>
  VENDOR_KEYS.filter(
    (key) => document.getElementById(`cavuno-analytics-${key}`) !== null,
  );

afterEach(() => {
  cleanup();
  startWebVitalsReporting.mockClear();
  localStorage.clear();
  // Consent now persists in a cookie too — clear it or an earlier test's
  // accept leaks into the next provider mount via the cookie-adoption path.
  document.cookie = `${COOKIE_CONSENT_COOKIE}=; Path=/; Max-Age=0`;
  for (const el of document.querySelectorAll(
    'script[id^="cavuno-analytics-"]',
  )) {
    el.remove();
  }
  for (const key of [
    'dataLayer',
    'gtag',
    'fbq',
    '_fbq',
    '_linkedin_partner_id',
    '_linkedin_data_partner_ids',
  ]) {
    Reflect.deleteProperty(window, key);
  }
});

function AcceptButton() {
  const { accept } = useCookieConsent();
  return (
    <button type="button" onClick={accept}>
      grant consent
    </button>
  );
}

describe('AnalyticsScripts', () => {
  it('injects every configured tracker when consent is not required', () => {
    render(
      <AnalyticsScripts
        analytics={analytics}
        reportWebVitals={startWebVitalsReporting}
      />,
    );

    expect(injectedKeys()).toEqual([...VENDOR_KEYS]);
    expect(startWebVitalsReporting).toHaveBeenCalledOnce();
    expect(
      document.getElementById('cavuno-analytics-ga4-loader'),
    ).toHaveAttribute(
      'src',
      'https://www.googletagmanager.com/gtag/js?id=G-TEST123',
    );
    expect(
      document.getElementById('cavuno-analytics-ga4')?.textContent,
    ).toContain(`window.gtag('config',"G-TEST123",{cookie_domain:`);
  });

  it('bootstraps each vendor runtime, not just the script tags', () => {
    // This jsdom setup does not auto-execute appended inline scripts, so
    // run the EXACT injected text by hand and assert its side effects —
    // the queues each vendor's external loader drains in a real browser.
    render(
      <AnalyticsScripts
        analytics={analytics}
        reportWebVitals={startWebVitalsReporting}
      />,
    );

    for (const key of VENDOR_KEYS) {
      const text = document.getElementById(
        `cavuno-analytics-${key}`,
      )?.textContent;
      expect(text, `${key} inline bootstrap`).toBeTruthy();
      if (!text) throw new Error(`Expected ${key} inline bootstrap text`);
      new Function(text)();
    }

    // GTM pushed its start event; GA4's gtag pushed js + config arguments.
    const flat = (window.dataLayer ?? []).map((entry) =>
      isGtmStartEvent(entry)
        ? Object.values(entry)
        : entry instanceof Object && 'length' in entry
          ? Array.from(entry as ArrayLike<unknown>)
          : Object.values(entry as Record<string, unknown>),
    );
    expect((window.dataLayer ?? []).some(isGtmStartEvent)).toBe(true);
    expect(flat.some((values) => values.includes('G-TEST123'))).toBe(true);

    // Meta's stub is callable and queued init + PageView for the loader.
    expect(window.fbq).toBeTypeOf('function');
    const fbqCalls = (
      (window.fbq as { queue?: IArguments[] } | undefined)?.queue ?? []
    ).map((args) => Array.from(args));
    expect(fbqCalls).toContainEqual(['init', '1234567890']);
    expect(fbqCalls).toContainEqual(['track', 'PageView']);

    // LinkedIn registered the partner id for insight.min.js.
    expect(window._linkedin_partner_id).toBe('54321');
    expect(window._linkedin_data_partner_ids).toContain('54321');
  });

  it('injects only the configured trackers', () => {
    render(
      <AnalyticsScripts
        analytics={{
          ga4MeasurementId: 'G-ONLY',
          gtmId: null,
          metaPixelId: null,
          linkedInPartnerId: null,
        }}
        reportWebVitals={startWebVitalsReporting}
      />,
    );

    expect(injectedKeys()).toEqual(['ga4']);
  });

  it('waits for an explicit accept on a consent-required board', () => {
    render(
      <CookieConsentProvider required>
        <AnalyticsScripts
          analytics={analytics}
          reportWebVitals={startWebVitalsReporting}
        />
        <AcceptButton />
      </CookieConsentProvider>,
    );

    // Effects have flushed (the accept button is interactive) and the
    // undecided visitor still has zero trackers.
    expect(injectedKeys()).toEqual([]);

    fireEvent.click(screen.getByRole('button', { name: 'grant consent' }));

    expect(injectedKeys()).toEqual([...VENDOR_KEYS]);
  });

  it('injects on load for a returning visitor who accepted', () => {
    localStorage.setItem(STORAGE_KEY, 'accepted');
    render(
      <CookieConsentProvider required>
        <AnalyticsScripts
          analytics={analytics}
          reportWebVitals={startWebVitalsReporting}
        />
      </CookieConsentProvider>,
    );

    expect(injectedKeys()).toEqual([...VENDOR_KEYS]);
  });

  it('loads nothing for a visitor who denied', () => {
    localStorage.setItem(STORAGE_KEY, 'denied');
    render(
      <CookieConsentProvider required>
        <AnalyticsScripts
          analytics={analytics}
          reportWebVitals={startWebVitalsReporting}
        />
      </CookieConsentProvider>,
    );

    expect(injectedKeys()).toEqual([]);
    expect(startWebVitalsReporting).not.toHaveBeenCalled();
  });
});
