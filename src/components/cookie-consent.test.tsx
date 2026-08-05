// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
/**
 * Cookie-consent behavior: the banner opens when required and undecided
 * without a hydration gate (SSR-safe initialChoice), accept/deny persist to
 * cookie (+ legacy localStorage) and close it, the "Cookie preferences"
 * reopener clears the choice and reopens it, legacy localStorage migrates
 * when no cookie exists, and the job-alert prompt yields the bottom-corner
 * slot while the banner is open.
 */
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// The job-alert prompt imports the subscribe server fn, whose real module
// chain reaches the Workers-only environment — stub the boundary in jsdom.
vi.mock('../server/queries', () => ({
  subscribeJobAlert: vi.fn(),
}));

import type { ReactNode } from 'react';

import { m } from '../paraglide/messages';
import {
  CookieConsentBanner,
  CookieConsentProvider,
  CookiePreferencesFooterAction,
} from './cookie-consent';
import { JobAlertFloatingPrompt } from './job-alert-floating-prompt';

import {
  COOKIE_CONSENT_COOKIE,
  serializeCookieConsent,
} from '@/lib/cookie-consent';

const STORAGE_KEY = 'cavuno:cookie-consent';

afterEach(() => {
  cleanup();
  localStorage.clear();
  document.cookie = `${COOKIE_CONSENT_COOKIE}=; Path=/; Max-Age=0`;
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

function Consent({
  required = true,
  initialChoice = null,
}: {
  required?: boolean;
  initialChoice?: 'accepted' | 'denied' | null;
}) {
  return (
    <CookieConsentProvider required={required} initialChoice={initialChoice}>
      <CookieConsentBanner />
      <CookiePreferencesFooterAction />
    </CookieConsentProvider>
  );
}

describe('CookieConsentBanner', () => {
  it('opens when required and undecided without waiting on a hydration gate', async () => {
    renderWithRouter(() => <Consent />);

    // findByRole waits for the memory router to settle; the provider itself
    // does not gate on mount — bannerOpen is required && choice === null.
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

  it('stays closed when initialChoice is already saved (server cookie)', async () => {
    renderWithRouter(() => <Consent initialChoice="denied" />);

    await screen.findByRole('button', {
      name: m.cookieConsent_preferencesLabel(),
    });
    expect(bannerRegion()).not.toBeInTheDocument();
  });

  it('never opens when the board does not require consent', async () => {
    renderWithRouter(() => (
      <>
        <Consent required={false} initialChoice="accepted" />
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

    // Migration on mount adopts localStorage → cookie + state; preferences
    // reopener surfaces once the choice is decided.
    await screen.findByRole('button', {
      name: m.cookieConsent_preferencesLabel(),
    });
    expect(bannerRegion()).not.toBeInTheDocument();
    expect(document.cookie).toContain(`${COOKIE_CONSENT_COOKIE}=accepted`);
  });

  it('adopts the browser cookie when the document was a stale undecided render', async () => {
    // Edge-cached/bfcache HTML can carry initialChoice=null even though the
    // visitor already chose: the browser cookie wins over the stale render.
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
    renderWithRouter(() => <Consent initialChoice="accepted" />);

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
        <JobAlertFloatingPrompt
          defaults={{ filters: {}, context: { source: 'jobs_list' } }}
          language="en"
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
