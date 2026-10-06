// @vitest-environment jsdom
// @vitest-environment-options {"url":"https://jobs.example.com/"}

import '@testing-library/jest-dom/vitest';
import type { ReactNode } from 'react';

/**
 * Cookie consent on boards using Google's consent message
 * (`ads.googleConsentMessage`), against a fake Google CMP (`googlefc` +
 * `__tcfapi`). Google in charge (`gdprApplies: true`): no banner of ours,
 * trackers follow the publisher-purpose consent, "Cookie preferences"
 * reopens Google's message. Otherwise: the board's banner as usual.
 */
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { m } from '../paraglide/messages';
import { AnalyticsScripts } from './analytics-scripts';
import { BoardAdsBoot } from './board/board-ads-boot';
import { BoardAdsProvider } from './board/board-ads-provider';
import {
  CookieConsentBanner,
  CookieConsentProvider,
  CookiePreferencesFooterAction,
} from './cookie-consent';

import {
  COOKIE_CONSENT_COOKIE,
  GOOGLE_DECLINE_STORAGE_KEY,
} from '@/lib/cookie-consent';
import { GOOGLE_CONSENT_TIMEOUT_MS, type TcData } from '@/lib/google-tcf';
import type { RecordConsentInput } from '@cavuno/board/analytics';

const granted = { 1: true, 7: true, 8: true, 9: true };
const refused = { 1: true, 7: false, 8: false, 9: false };

/** TCF listeners the provider registered with the fake CMP. */
const listeners: Array<(tcData: TcData, success: boolean) => void> = [];

/** Google's queue as Funding Choices installs it: runs items at once. */
function installFakeCmp() {
  const showRevocationMessage = vi.fn();
  window.googlefc = {
    callbackQueue: {
      push: (item) => {
        item.CONSENT_API_READY?.();
        item.CONSENT_DATA_READY?.();
      },
    },
    showRevocationMessage,
  };
  window.__tcfapi = (command, _version, callback) => {
    if (command === 'addEventListener') listeners.push(callback);
  };
  const emit = (tcData: TcData) =>
    act(() => {
      for (const listener of listeners) {
        listener({ cmpId: 300, cmpVersion: 7, ...tcData }, true);
      }
    });
  return { emit, showRevocationMessage };
}

/**
 * Fires the provider's CMP timeout on demand (the router renders on real
 * timers, so the clock itself is not faked).
 */
function captureConsentTimeout() {
  const setTimeoutSpy = vi.spyOn(window, 'setTimeout');
  return () => {
    const call = setTimeoutSpy.mock.calls.find(
      ([, delay]) => delay === GOOGLE_CONSENT_TIMEOUT_MS,
    );
    expect(call).toBeDefined();
    // SAFETY: the matched call is the provider's timeout, a plain callback.
    act(() => (call![0] as () => void)());
  };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  listeners.length = 0;
  delete window.googlefc;
  delete window.__tcfapi;
  delete window.__cavunoAnalyticsOff;
  for (const name of [COOKIE_CONSENT_COOKIE, 'cavuno_consent_id']) {
    document.cookie = `${name}=; Path=/; Max-Age=0`;
  }
  document.getElementById('cavuno-analytics-ga4')?.remove();
  document.getElementById('cavuno-adsense-loader')?.remove();
  localStorage.clear();
});

async function renderBoard({
  googleConsentMessage = true,
  required = true,
  nonAdRoute = false,
}: {
  googleConsentMessage?: boolean;
  required?: boolean;
  /** Mount the AdSense boot as the root does on a route without ads. */
  nonAdRoute?: boolean;
} = {}) {
  const withdraw = vi.fn();
  const recordConsent = vi.fn<(input: RecordConsentInput) => void>();
  const ui = () => (
    <BoardAdsProvider
      ads={{
        enabled: true,
        clientId: 'ca-pub-1234567890123456',
        googleConsentMessage,
      }}
    >
      <CookieConsentProvider
        required={required}
        publishableKey="pk_test_board"
        withdrawAnalytics={withdraw}
        recordConsent={recordConsent}
      >
        <AnalyticsScripts
          analytics={{
            ga4MeasurementId: 'G-TEST123',
            gtmId: null,
            metaPixelId: null,
            linkedInPartnerId: null,
          }}
          reportWebVitals={async () => {}}
        />
        {nonAdRoute && <BoardAdsBoot adPage={false} />}
        <CookieConsentBanner />
        <CookiePreferencesFooterAction />
        <span data-testid="mounted" />
      </CookieConsentProvider>
    </BoardAdsProvider>
  );
  const rootRoute = createRootRoute();
  const route = (path: string, component?: () => ReactNode) =>
    createRoute({ getParentRoute: () => rootRoute, path, component });
  const router = createRouter({
    routeTree: rootRoute.addChildren([route('/', ui), route('/cookie-policy')]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });
  render(<RouterProvider router={router} />);
  await screen.findByTestId('mounted');
  // The bridge loads on demand; wait until it listens to the CMP.
  if (googleConsentMessage && window.__tcfapi) {
    await vi.waitFor(() => expect(listeners).not.toHaveLength(0));
  }
  return { withdraw, recordConsent };
}

const bannerRegion = () =>
  screen.queryByRole('region', { name: m.cookieConsent_regionAriaLabel() });
const ga4Loaded = () => document.getElementById('cavuno-analytics-ga4');
const preferences = () =>
  screen.queryByRole('button', { name: m.cookieConsent_preferencesLabel() });

describe('Google’s consent message in charge (gdprApplies true)', () => {
  it('loads trackers on publisher consent and never shows our banner', async () => {
    const cmp = installFakeCmp();
    await renderBoard();
    expect(bannerRegion()).not.toBeInTheDocument();
    expect(ga4Loaded()).toBeNull();

    cmp.emit({
      gdprApplies: true,
      eventStatus: 'tcloaded',
      publisher: { consents: granted },
    });

    expect(ga4Loaded()).not.toBeNull();
    expect(bannerRegion()).not.toBeInTheDocument();
  });

  it('keeps trackers off without publisher consent, still without our banner', async () => {
    const cmp = installFakeCmp();
    await renderBoard();

    cmp.emit({ gdprApplies: true, eventStatus: 'cmpuishown' });
    expect(ga4Loaded()).toBeNull();
    cmp.emit({
      gdprApplies: true,
      eventStatus: 'useractioncomplete',
      publisher: { consents: refused },
    });

    expect(ga4Loaded()).toBeNull();
    expect(bannerRegion()).not.toBeInTheDocument();
  });

  it('applies even when the board does not require consent', async () => {
    const cmp = installFakeCmp();
    await renderBoard({ required: false });

    cmp.emit({ gdprApplies: true, eventStatus: 'cmpuishown' });

    expect(ga4Loaded()).toBeNull();
  });

  it('"Cookie preferences" reopens Google’s message', async () => {
    const cmp = installFakeCmp();
    await renderBoard();
    cmp.emit({
      gdprApplies: true,
      eventStatus: 'tcloaded',
      publisher: { consents: refused },
    });

    act(() => preferences()?.click());

    expect(cmp.showRevocationMessage).toHaveBeenCalledOnce();
    expect(bannerRegion()).not.toBeInTheDocument();
  });

  it('withdraws loaded trackers when consent is revoked, keeping AdSense', async () => {
    const cmp = installFakeCmp();
    const { withdraw, recordConsent } = await renderBoard();
    cmp.emit({
      gdprApplies: true,
      eventStatus: 'tcloaded',
      publisher: { consents: granted },
    });
    expect(ga4Loaded()).not.toBeNull();

    // Reopened message: no answer yet, the earlier one stands.
    cmp.emit({ gdprApplies: true, eventStatus: 'cmpuishown' });
    expect(withdraw).not.toHaveBeenCalled();
    cmp.emit({
      gdprApplies: true,
      eventStatus: 'useractioncomplete',
      publisher: { consents: refused },
    });

    expect(withdraw).toHaveBeenCalledExactlyOnceWith({ keepAdSense: true });
    expect(recordConsent).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ choice: 'withdrawn' }),
    );
    expect(recordConsent.mock.invocationCallOrder[0]).toBeLessThan(
      withdraw.mock.invocationCallOrder[0]!,
    );
  });

  it('loads the tag on a route without ads and waits for the CMP there', async () => {
    const cmp = installFakeCmp();
    await renderBoard({ nonAdRoute: true });
    await vi.waitFor(() =>
      expect(document.getElementById('cavuno-adsense-loader')).not.toBeNull(),
    );
    expect(bannerRegion()).not.toBeInTheDocument();
    expect(ga4Loaded()).toBeNull();

    cmp.emit({ gdprApplies: true, eventStatus: 'cmpuishown' });
    expect(ga4Loaded()).toBeNull();
    cmp.emit({
      gdprApplies: true,
      eventStatus: 'useractioncomplete',
      publisher: { consents: granted },
    });

    expect(ga4Loaded()).not.toBeNull();
    expect(bannerRegion()).not.toBeInTheDocument();
  });

  it('records a withdrawal when trackers the fallback loaded are declined', async () => {
    const timeout = captureConsentTimeout();
    const cmp = installFakeCmp();
    const { withdraw, recordConsent } = await renderBoard({ required: false });
    timeout();
    expect(ga4Loaded()).not.toBeNull();

    cmp.emit({ gdprApplies: true, eventStatus: 'cmpuishown' });
    cmp.emit({
      gdprApplies: true,
      eventStatus: 'useractioncomplete',
      publisher: { consents: refused },
    });

    expect(recordConsent).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ choice: 'withdrawn' }),
    );
    expect(withdraw).toHaveBeenCalledExactlyOnceWith({ keepAdSense: true });
  });

  it('tells other tabs about a decline, and stops analytics on one from another tab', async () => {
    const cmp = installFakeCmp();
    await renderBoard();
    cmp.emit({
      gdprApplies: true,
      eventStatus: 'useractioncomplete',
      publisher: { consents: refused },
    });
    expect(localStorage.getItem(GOOGLE_DECLINE_STORAGE_KEY)).not.toBeNull();

    document.cookie = 'session-id=abc; Path=/';
    document.cookie = '__gads=ad; Path=/';
    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: GOOGLE_DECLINE_STORAGE_KEY,
          newValue: String(Date.now()),
        }),
      );
    });

    expect(window.__cavunoAnalyticsOff).toBe(true);
    expect(document.cookie).not.toContain('session-id=');
    expect(document.cookie).toContain('__gads=ad');
    document.cookie = '__gads=; Path=/; Max-Age=0';
  });

  it('records answers only on useractioncomplete, with a Google version', async () => {
    const cmp = installFakeCmp();
    const { recordConsent } = await renderBoard();
    cmp.emit({
      gdprApplies: true,
      eventStatus: 'tcloaded',
      publisher: { consents: refused },
    });
    expect(recordConsent).not.toHaveBeenCalled();

    cmp.emit({
      gdprApplies: true,
      eventStatus: 'useractioncomplete',
      publisher: { consents: granted },
    });

    expect(recordConsent).toHaveBeenCalledExactlyOnceWith({
      publishableKey: 'pk_test_board',
      consentId: expect.stringMatching(/^[0-9a-f-]{36}$/),
      choice: 'accepted',
      bannerVersion: expect.stringMatching(/^g1-cmp300v7-[0-9a-f]{8}$/),
    });
    const [{ consentId }] = recordConsent.mock.calls[0]!;
    expect(document.cookie).toContain(`cavuno_consent_id=${consentId}`);
    expect(document.cookie).not.toContain(`${COOKIE_CONSENT_COOKIE}=`);
  });
});

describe('the board’s banner applies', () => {
  it('when GDPR does not apply to the visitor', async () => {
    const cmp = installFakeCmp();
    await renderBoard();
    expect(bannerRegion()).not.toBeInTheDocument();

    cmp.emit({ gdprApplies: false });

    expect(bannerRegion()).toBeInTheDocument();
    expect(ga4Loaded()).toBeNull();
  });

  it('when Google’s CMP does not answer in time', async () => {
    const timeout = captureConsentTimeout();
    installFakeCmp();
    await renderBoard();
    expect(bannerRegion()).not.toBeInTheDocument();

    timeout();

    expect(bannerRegion()).toBeInTheDocument();
  });

  it('until a late Google answer arrives while ours is unanswered', async () => {
    const timeout = captureConsentTimeout();
    const cmp = installFakeCmp();
    await renderBoard();
    timeout();
    expect(bannerRegion()).toBeInTheDocument();

    cmp.emit({ gdprApplies: true, eventStatus: 'cmpuishown' });

    expect(bannerRegion()).not.toBeInTheDocument();
  });

  it('immediately when the board does not use Google’s message', async () => {
    installFakeCmp();
    await renderBoard({ googleConsentMessage: false });

    expect(bannerRegion()).toBeInTheDocument();
    act(() =>
      screen
        .getByRole('button', { name: m.cookieConsent_acceptLabel() })
        .click(),
    );
    expect(ga4Loaded()).not.toBeNull();
    act(() => preferences()?.click());
    expect(window.googlefc?.showRevocationMessage).not.toHaveBeenCalled();
    expect(bannerRegion()).toBeInTheDocument();
  });
});
