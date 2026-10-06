// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

/**
 * Cookie-consent behavior: the choice is resolved client-side after mount
 * so SSR / the first render never paint the banner or footer action. After
 * mount, no cookie + required opens the banner; a saved cookie or
 * localStorage choice closes it and shows "Cookie preferences". Accept/deny
 * persist to cookie (+ the cross-tab localStorage mirror); the reopener
 * clears them.
 */
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest';

import { m } from '../paraglide/messages';
import { AnalyticsScripts } from './analytics-scripts';
import {
  CookieConsentBanner,
  CookieConsentProvider,
  CookiePreferencesFooterAction,
  useCookieConsent,
} from './cookie-consent';
import { JobAlertFloatingPromptView } from './job-alert-floating-prompt-view';

import {
  COOKIE_CONSENT_COOKIE,
  serializeCookieConsent,
} from '@/lib/cookie-consent';
import type { RecordConsentInput } from '@cavuno/board/analytics';

const STORAGE_KEY = 'cavuno:cookie-consent';

afterEach(() => {
  cleanup();
  localStorage.clear();
  delete window.__cavunoAnalyticsOff;
  document.cookie = `${COOKIE_CONSENT_COOKIE}=; Path=/; Max-Age=0`;
  for (const el of document.querySelectorAll(
    'script[id^="cavuno-analytics-"]',
  )) {
    el.remove();
  }
});

/**
 * The banner links to /cookie-policy, so it renders under a real memory
 * router (same harness as Header.test).
 */
function renderWithRouter(ui: () => ReactNode) {
  const rootRoute = createRootRoute();
  const route = (path: string, component?: () => ReactNode) =>
    createRoute({ getParentRoute: () => rootRoute, path, component });
  const router = createRouter({
    routeTree: rootRoute.addChildren([route('/', ui), route('/cookie-policy')]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });
  render(<RouterProvider router={router} />);
}

const bannerRegion = () =>
  screen.queryByRole('region', { name: m.cookieConsent_regionAriaLabel() });

function Consent({ required = true }: { required?: boolean }) {
  return (
    <CookieConsentProvider required={required}>
      <CookieConsentBanner />
      <CookiePreferencesFooterAction />
    </CookieConsentProvider>
  );
}

function FirstRenderProbe({
  seen,
}: {
  seen: Array<{ bannerOpen: boolean; choice: unknown }>;
}) {
  const { bannerOpen, choice } = useCookieConsent();
  seen.push({ bannerOpen, choice });
  return null;
}

describe('CookieConsentBanner', () => {
  it.each([
    ['no cookie', ''],
    ['accepted cookie', `${COOKIE_CONSENT_COOKIE}=accepted; Path=/`],
    ['denied cookie', `${COOKIE_CONSENT_COOKIE}=denied; Path=/`],
  ])(
    'SSR markup contains no banner and no preferences action (%s)',
    (_label, cookie) => {
      if (cookie) document.cookie = cookie;
      const html = renderToStaticMarkup(
        <CookieConsentProvider required>
          <CookieConsentBanner />
          <CookiePreferencesFooterAction />
        </CookieConsentProvider>,
      );
      expect(html).toBe('');
    },
  );

  it.each([
    [
      'no cookie',
      '',
      () =>
        screen.findByRole('region', {
          name: m.cookieConsent_regionAriaLabel(),
        }),
    ],
    [
      'accepted cookie',
      `${COOKIE_CONSENT_COOKIE}=accepted; Path=/`,
      () =>
        screen.findByRole('button', {
          name: m.cookieConsent_preferencesLabel(),
        }),
    ],
    [
      'denied cookie',
      `${COOKIE_CONSENT_COOKIE}=denied; Path=/`,
      () =>
        screen.findByRole('button', {
          name: m.cookieConsent_preferencesLabel(),
        }),
    ],
  ])(
    'first client render shows no banner regardless of cookie (%s)',
    async (_label, cookie, waitForSettled) => {
      if (cookie) document.cookie = cookie;
      const seen: Array<{ bannerOpen: boolean; choice: unknown }> = [];
      renderWithRouter(() => (
        <CookieConsentProvider required>
          <FirstRenderProbe seen={seen} />
          <CookieConsentBanner />
          <CookiePreferencesFooterAction />
        </CookieConsentProvider>
      ));

      await waitForSettled();
      expect(seen[0]).toEqual({ bannerOpen: false, choice: undefined });
    },
  );

  it('opens after mount when required and no cookie is present', async () => {
    renderWithRouter(() => <Consent />);

    await screen.findByRole('region', {
      name: m.cookieConsent_regionAriaLabel(),
    });
  });

  it('opens until accepted, then persists the choice and closes', async () => {
    renderWithRouter(() => <Consent />);

    await screen.findByRole('region', {
      name: m.cookieConsent_regionAriaLabel(),
    });
    fireEvent.click(
      screen.getByRole('button', { name: m.cookieConsent_acceptLabel() }),
    );

    expect(document.cookie).toContain(`${COOKIE_CONSENT_COOKIE}=accepted`);
    expect(localStorage.getItem(STORAGE_KEY)).toBe('accepted');
    expect(bannerRegion()).not.toBeInTheDocument();
  });

  it('closes on deny without granting consent', async () => {
    renderWithRouter(() => <Consent />);

    await screen.findByRole('region', {
      name: m.cookieConsent_regionAriaLabel(),
    });
    fireEvent.click(
      screen.getByRole('button', { name: m.cookieConsent_denyLabel() }),
    );

    expect(document.cookie).toContain(`${COOKIE_CONSENT_COOKIE}=denied`);
    expect(localStorage.getItem(STORAGE_KEY)).toBe('denied');
    expect(bannerRegion()).not.toBeInTheDocument();
  });

  it('after mount with an accepted cookie, hides the banner, shows preferences, and allows analytics', async () => {
    document.cookie = `${COOKIE_CONSENT_COOKIE}=accepted; Path=/`;
    renderWithRouter(() => (
      <CookieConsentProvider required>
        <CookieConsentBanner />
        <CookiePreferencesFooterAction />
        <AnalyticsScripts
          analytics={{
            ga4MeasurementId: 'G-TEST123',
            gtmId: null,
            metaPixelId: null,
            linkedInPartnerId: null,
          }}
        />
      </CookieConsentProvider>
    ));

    await screen.findByRole('button', {
      name: m.cookieConsent_preferencesLabel(),
    });
    expect(bannerRegion()).not.toBeInTheDocument();
    // The GA4 tag is injected from an effect once consent resolves; on a slow
    // runner it lands a tick after the preferences button, so wait for it.
    await waitFor(() =>
      expect(document.getElementById('cavuno-analytics-ga4')).not.toBeNull(),
    );
  });

  it('never opens when the board does not require consent', async () => {
    renderWithRouter(() => (
      <>
        <Consent required={false} />
        <p>page content</p>
      </>
    ));

    await screen.findByText('page content');
    expect(bannerRegion()).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', {
        name: m.cookieConsent_preferencesLabel(),
      }),
    ).not.toBeInTheDocument();
  });

  it('migrates a legacy localStorage choice when no cookie is present', async () => {
    localStorage.setItem(STORAGE_KEY, 'accepted');
    renderWithRouter(() => <Consent />);

    await screen.findByRole('button', {
      name: m.cookieConsent_preferencesLabel(),
    });
    expect(bannerRegion()).not.toBeInTheDocument();
    expect(document.cookie).toContain(`${COOKIE_CONSENT_COOKIE}=accepted`);
  });

  it('adopts the browser cookie when the document was a stale undecided render', async () => {
    document.cookie = `${COOKIE_CONSENT_COOKIE}=denied; Path=/`;
    renderWithRouter(() => <Consent />);

    await screen.findByRole('button', {
      name: m.cookieConsent_preferencesLabel(),
    });
    expect(bannerRegion()).not.toBeInTheDocument();
  });
});

describe('CookiePreferencesFooterAction', () => {
  it('clears the saved choice and reopens the banner', async () => {
    document.cookie = serializeCookieConsent('accepted');
    renderWithRouter(() => <Consent />);

    fireEvent.click(
      await screen.findByRole('button', {
        name: m.cookieConsent_preferencesLabel(),
      }),
    );

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    await screen.findByRole('region', {
      name: m.cookieConsent_regionAriaLabel(),
    });
    expect(
      screen.queryByRole('button', {
        name: m.cookieConsent_preferencesLabel(),
      }),
    ).not.toBeInTheDocument();
  });
});

describe('floating-stack slot handover', () => {
  it('hides the job-alert prompt while the banner is open, restores it after a choice', async () => {
    renderWithRouter(() => (
      <CookieConsentProvider required>
        <JobAlertFloatingPromptView
          defaults={{ filters: {}, context: { source: 'jobs_list' } }}
          language="en"
          subscribe={vi.fn()}
        />
        <CookieConsentBanner />
      </CookieConsentProvider>
    ));

    await screen.findByRole('region', {
      name: m.cookieConsent_regionAriaLabel(),
    });
    expect(
      screen.queryByRole('heading', {
        name: m.jobAlertFloatingPrompt_defaultTitle(),
      }),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: m.cookieConsent_acceptLabel() }),
    );

    await screen.findByRole('heading', {
      name: m.jobAlertFloatingPrompt_defaultTitle(),
    });
    expect(bannerRegion()).not.toBeInTheDocument();
  });
});

describe('a choice made in another tab', () => {
  /** A tracker that has run in this document. */
  function LoadedTracker() {
    const { markAnalyticsLoaded } = useCookieConsent();
    useEffect(markAnalyticsLoaded, [markAnalyticsLoaded]);
    return <p>Tracker</p>;
  }

  function renderLoaded() {
    document.cookie = serializeCookieConsent('accepted');
    const withdraw = vi.fn();
    renderWithRouter(() => (
      <CookieConsentProvider required withdrawAnalytics={withdraw}>
        <LoadedTracker />
        <CookiePreferencesFooterAction />
      </CookieConsentProvider>
    ));
    return { withdraw };
  }

  const otherTab = (newValue: string | null) =>
    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', { key: STORAGE_KEY, newValue }),
      );
    });

  it('a decline stops Cavuno Analytics and clears cookies without a reload', async () => {
    const { withdraw } = renderLoaded();
    await screen.findByText('Tracker');
    document.cookie = '_ga=GA1.1.1; Path=/';

    otherTab('denied');

    expect(withdraw).not.toHaveBeenCalled();
    expect(window.__cavunoAnalyticsOff).toBe(true);
    expect(document.cookie).not.toContain('_ga=');
  });

  it('an accept after a decline lifts the kill switch', async () => {
    renderLoaded();
    await screen.findByText('Tracker');

    otherTab('denied');
    otherTab('accepted');

    expect(window.__cavunoAnalyticsOff).toBe(false);
  });

  it('a reopen leaves this tab alone', async () => {
    const { withdraw } = renderLoaded();
    await screen.findByRole('button', {
      name: m.cookieConsent_preferencesLabel(),
    });

    otherTab(null);

    expect(window.__cavunoAnalyticsOff).toBeUndefined();
    expect(
      screen.getByRole('button', { name: m.cookieConsent_preferencesLabel() }),
    ).toBeInTheDocument();
    expect(withdraw).not.toHaveBeenCalled();
  });
});

describe('recording consent choices', () => {
  const UUID_V4 =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

  /** A tracker that has run in this document. */
  function LoadedTracker() {
    const { markAnalyticsLoaded } = useCookieConsent();
    useEffect(markAnalyticsLoaded, [markAnalyticsLoaded]);
    return null;
  }

  /** Reaches accept() where no banner renders (consent not required). */
  function AcceptProbe() {
    const { accept } = useCookieConsent();
    return (
      <button type="button" onClick={accept}>
        probe-accept
      </button>
    );
  }

  type RecordMock = Mock<(input: RecordConsentInput) => void>;

  function renderRecording({
    required = true,
    hostname = 'jobs.example.com',
    loaded = false,
    recordConsent = vi.fn<(input: RecordConsentInput) => void>(),
  }: {
    required?: boolean;
    hostname?: string;
    loaded?: boolean;
    recordConsent?: RecordMock;
  } = {}) {
    const withdraw = vi.fn();
    renderWithRouter(() => (
      <CookieConsentProvider
        required={required}
        publishableKey="pk_test_board"
        hostname={hostname}
        recordConsent={recordConsent}
        withdrawAnalytics={withdraw}
      >
        {loaded ? <LoadedTracker /> : null}
        <AcceptProbe />
        <CookieConsentBanner />
        <CookiePreferencesFooterAction />
      </CookieConsentProvider>
    ));
    return { recordConsent, withdraw };
  }

  const click = async (name: string) =>
    fireEvent.click(await screen.findByRole('button', { name }));
  const accept = () => click(m.cookieConsent_acceptLabel());
  const deny = () => click(m.cookieConsent_denyLabel());
  const reopen = () => click(m.cookieConsent_preferencesLabel());
  const recorded = (recordConsent: RecordMock) =>
    recordConsent.mock.calls.map(([input]) => input);

  it('records an accept once, with a new consent id and the banner version', async () => {
    const { recordConsent } = renderRecording();

    await accept();

    expect(recorded(recordConsent)).toEqual([
      {
        publishableKey: 'pk_test_board',
        consentId: expect.stringMatching(UUID_V4),
        choice: 'accepted',
        bannerVersion: expect.stringMatching(/^v1-[0-9a-f]{8}$/),
      },
    ]);
    const [{ consentId }] = recorded(recordConsent);
    expect(document.cookie).toContain(
      `${COOKIE_CONSENT_COOKIE}=accepted.${consentId}`,
    );
  });

  it('records a first decline as denied, with nothing to withdraw', async () => {
    const { recordConsent, withdraw } = renderRecording();

    await deny();

    expect(recorded(recordConsent)).toMatchObject([{ choice: 'denied' }]);
    expect(withdraw).not.toHaveBeenCalled();
  });

  it('records a decline after an accept as withdrawn, before the reload', async () => {
    const { recordConsent, withdraw } = renderRecording({ loaded: true });

    await accept();
    await reopen();
    await deny();

    const [accepted, withdrawn] = recorded(recordConsent);
    expect(withdrawn).toMatchObject({
      choice: 'withdrawn',
      consentId: accepted.consentId,
    });
    expect(withdraw).toHaveBeenCalledOnce();
    expect(recordConsent.mock.invocationCallOrder[1]).toBeLessThan(
      withdraw.mock.invocationCallOrder[0]!,
    );
  });

  it('keeps the consent id across a reopen and a reload', async () => {
    const consentId = '0b0e7c3a-5d1f-4a2b-9c3d-4e5f6a7b8c9d';
    document.cookie = serializeCookieConsent('accepted', consentId);
    const { recordConsent } = renderRecording();

    await reopen();
    expect(document.cookie).toContain(consentId);
    cleanup();
    renderRecording({ recordConsent });
    await deny();

    expect(recorded(recordConsent)).toEqual([
      expect.objectContaining({ choice: 'withdrawn', consentId }),
    ]);
  });

  it('reads an old cookie without an id and adds one on the next choice', async () => {
    document.cookie = `${COOKIE_CONSENT_COOKIE}=accepted; Path=/`;
    const { recordConsent } = renderRecording();

    await reopen();
    await accept();

    const [{ consentId }] = recorded(recordConsent);
    expect(consentId).toMatch(UUID_V4);
    expect(document.cookie).toContain(
      `${COOKIE_CONSENT_COOKIE}=accepted.${consentId}`,
    );
  });

  it('records nothing on page load or for a choice made in another tab', async () => {
    document.cookie = serializeCookieConsent('accepted');
    const { recordConsent } = renderRecording({ loaded: true });
    await screen.findByRole('button', {
      name: m.cookieConsent_preferencesLabel(),
    });

    act(() => {
      for (const newValue of ['denied', 'accepted']) {
        window.dispatchEvent(
          new StorageEvent('storage', { key: STORAGE_KEY, newValue }),
        );
      }
    });

    expect(recordConsent).not.toHaveBeenCalled();
  });

  it('saves the choice and closes the banner when recording throws', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { withdraw } = renderRecording({
      loaded: true,
      recordConsent: vi.fn<(input: RecordConsentInput) => void>(() => {
        throw new Error('bad key');
      }),
    });

    await accept();
    expect(bannerRegion()).not.toBeInTheDocument();
    await reopen();
    await deny();

    expect(document.cookie).toContain(`${COOKIE_CONSENT_COOKIE}=denied.`);
    expect(bannerRegion()).not.toBeInTheDocument();
    expect(withdraw).toHaveBeenCalledOnce();
    expect(warn).toHaveBeenCalledTimes(2);
    warn.mockRestore();
  });

  it('records nothing when the board does not require consent', async () => {
    const { recordConsent } = renderRecording({ required: false });

    await click('probe-accept');

    expect(recordConsent).not.toHaveBeenCalled();
  });

  it('records nothing on a working-preview host', async () => {
    const { recordConsent } = renderRecording({
      hostname: 'board-1.preview.cavuno.com',
    });

    await accept();

    expect(document.cookie).toContain(`${COOKIE_CONSENT_COOKIE}=accepted.`);
    expect(recordConsent).not.toHaveBeenCalled();
  });
});
