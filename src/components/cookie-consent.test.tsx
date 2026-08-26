// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import type { ReactNode } from 'react';

/**
 * Cookie-consent behavior: the choice is resolved client-side after mount
 * so SSR / the first render never paint the banner or footer action. After
 * mount, no cookie + required opens the banner; a saved cookie or legacy
 * localStorage choice closes it and shows "Cookie preferences". Accept/deny
 * persist to cookie (+ legacy localStorage); the reopener clears them.
 */
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

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

const STORAGE_KEY = 'cavuno:cookie-consent';

afterEach(() => {
  cleanup();
  localStorage.clear();
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
    expect(document.getElementById('cavuno-analytics-ga4')).not.toBeNull();
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
