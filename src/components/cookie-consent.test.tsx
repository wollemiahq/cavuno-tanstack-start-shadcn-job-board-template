// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
/**
 * Cookie-consent behavior: the banner opens only on consent-required
 * boards with no saved choice, accept/deny persist and close it, the
 * "Cookie preferences" reopener clears the choice and reopens it, and the
 * job-alert prompt yields the bottom-corner slot while the banner is open.
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

const STORAGE_KEY = 'cavuno:cookie-consent';

afterEach(() => {
  cleanup();
  localStorage.clear();
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

describe('CookieConsentBanner', () => {
  it('opens until accepted, then persists the choice and closes', async () => {
    renderWithRouter(() => <Consent />);

    await screen.findByRole('region', {
      name: m.cookieConsent_regionAriaLabel(),
    });
    fireEvent.click(
      screen.getByRole('button', { name: m.cookieConsent_acceptLabel() }),
    );

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

    expect(localStorage.getItem(STORAGE_KEY)).toBe('denied');
    expect(bannerRegion()).not.toBeInTheDocument();
  });

  it('stays closed when a choice is already saved', async () => {
    localStorage.setItem(STORAGE_KEY, 'denied');
    renderWithRouter(() => <Consent />);

    // The saved choice surfaces the preferences reopener — once it is
    // there, hydration has resolved and the banner's absence is meaningful.
    await screen.findByRole('button', {
      name: m.cookieConsent_preferencesLabel(),
    });
    expect(bannerRegion()).not.toBeInTheDocument();
  });

  it('never opens when the board does not require consent', async () => {
    localStorage.setItem(STORAGE_KEY, 'accepted');
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
});

describe('CookiePreferencesFooterAction', () => {
  it('clears the saved choice and reopens the banner', async () => {
    localStorage.setItem(STORAGE_KEY, 'accepted');
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
    // Undecided again — the reopener hides until the next choice.
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
