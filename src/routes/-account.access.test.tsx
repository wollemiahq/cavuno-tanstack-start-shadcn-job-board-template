// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import {
  act,
  cleanup,
  fireEvent,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderRouted } from '@/test/render-routed';
import type { AccessGrant, PaywallOffer } from '@cavuno/board';

interface AccessLoaderData {
  grant: AccessGrant;
  offers: PaywallOffer[];
}

interface AccessSearch {
  session_id?: string;
  returnTo?: string;
}

const mocks = {
  getAccessGrant: vi.fn(),
  getPaywallOffers: vi.fn(),
  invalidate: vi.fn(),
  navigate: vi.fn(() => Promise.resolve()),
  openBillingPortal: vi.fn(),
  startCheckout: vi.fn(),
  toastActionError: vi.fn(),
  // AccessPage reads its route data via `getRouteApi('/account_/access')`; the
  // hook stubs below stand in for that route match under jsdom.
  useLoaderData: vi.fn<() => AccessLoaderData>(),
  useSearch: vi.fn<() => AccessSearch>(),
};

import { AccessPageView, accessReturnPath, safeReturnTo } from './-access-page';

const grant = {
  object: 'access_grant',
  hasAccess: false,
  status: null,
  offerType: null,
  offerKey: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
} satisfies AccessGrant;

const offer = {
  object: 'paywall_offer',
  offerKey: 'monthly',
  label: 'Monthly access',
  billingLabel: 'per month',
  amountCents: 1200,
  currency: 'usd',
  offerType: 'recurring',
  intervalUnit: 'month',
  intervalCount: 1,
  isDefault: true,
} satisfies PaywallOffer;

const annualOffer = {
  ...offer,
  offerKey: 'annual',
  label: 'Annual access',
  billingLabel: 'per year',
  amountCents: 12000,
  intervalUnit: 'year',
  isDefault: false,
} satisfies PaywallOffer;

async function renderAccessPage() {
  const loaderData = mocks.useLoaderData();
  const search = mocks.useSearch();
  return await renderRouted(
    <AccessPageView
      grant={loaderData.grant}
      offers={loaderData.offers}
      sessionId={search.session_id}
      returnToRaw={search.returnTo}
      getAccessGrantAction={mocks.getAccessGrant}
      openBillingPortalAction={mocks.openBillingPortal}
      startCheckoutAction={mocks.startCheckout}
      invalidate={mocks.invalidate}
      navigate={mocks.navigate}
      reportActionError={mocks.toastActionError}
    />,
  );
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe('candidate access actions', () => {
  it('disables every offer while checkout is starting', async () => {
    mocks.useLoaderData.mockReturnValue({
      grant,
      offers: [offer, annualOffer],
    });
    mocks.useSearch.mockReturnValue({ session_id: undefined });
    let rejectCheckout: (reason?: Error) => void = () => {
      throw new Error('Checkout rejection was not initialized');
    };
    mocks.startCheckout.mockImplementation(
      () =>
        new Promise((_, reject) => {
          rejectCheckout = reject;
        }),
    );

    await renderAccessPage();
    fireEvent.click(screen.getAllByRole('button', { name: 'Choose' })[0]!);

    for (const button of screen.getAllByRole('button')) {
      expect(button).toBeDisabled();
    }

    await act(async () => {
      rejectCheckout(new Error('checkout unavailable'));
    });
  });

  it('fires a recoverable error toast and re-enables checkout when session creation fails', async () => {
    mocks.useLoaderData.mockReturnValue({
      grant,
      offers: [offer],
    });
    mocks.useSearch.mockReturnValue({ session_id: undefined });
    mocks.startCheckout.mockRejectedValue(new Error('checkout unavailable'));

    await renderAccessPage();
    fireEvent.click(screen.getByRole('button', { name: 'Choose' }));

    await waitFor(() => {
      expect(mocks.toastActionError).toHaveBeenCalled();
      expect(screen.getByRole('button', { name: 'Choose' })).toBeEnabled();
    });
  });

  it('fires a recoverable error toast and re-enables the billing portal after failure', async () => {
    mocks.useLoaderData.mockReturnValue({
      grant: {
        ...grant,
        hasAccess: true,
        status: 'active',
        offerType: 'recurring',
      },
      offers: [],
    });
    mocks.useSearch.mockReturnValue({ session_id: undefined });
    mocks.openBillingPortal.mockRejectedValue(new Error('portal unavailable'));

    await renderAccessPage();
    fireEvent.click(
      screen.getByRole('button', { name: 'Manage subscription' }),
    );

    await waitFor(() => {
      expect(mocks.toastActionError).toHaveBeenCalled();
      expect(
        screen.getByRole('button', { name: 'Manage subscription' }),
      ).toBeEnabled();
    });
  });

  it('renders a plan option per offer for a viewer without access', async () => {
    mocks.useLoaderData.mockReturnValue({
      grant,
      offers: [offer, annualOffer],
    });
    mocks.useSearch.mockReturnValue({ session_id: undefined });

    await renderAccessPage();

    expect(screen.getAllByRole('button', { name: 'Choose' })).toHaveLength(2);
    expect(
      screen.queryByRole('button', { name: 'Manage subscription' }),
    ).toBeNull();
  });

  it('carries the captured destination into the Stripe checkout return path', async () => {
    // Redirect-based methods (3DS/SCA, iDEAL, Klarna) navigate away, so the
    // in-page `onComplete` never fires: the destination has to ride the
    // `return_url` or the buyer parks on this page.
    mocks.useLoaderData.mockReturnValue({ grant, offers: [offer] });
    mocks.useSearch.mockReturnValue({ returnTo: '/jobs?q=react' });
    // Rejecting keeps the plan picker mounted; the call arguments are the
    // subject here, not the Stripe iframe.
    mocks.startCheckout.mockRejectedValue(new Error('checkout unavailable'));

    await renderAccessPage();
    fireEvent.click(screen.getByRole('button', { name: 'Choose' }));

    await waitFor(() => {
      expect(mocks.startCheckout).toHaveBeenCalledWith({
        data: {
          offerKey: 'monthly',
          returnPath: '/account/access?returnTo=%2Fjobs%3Fq%3Dreact',
        },
      });
    });
  });

  it('drops an unsafe captured destination from the checkout return path', async () => {
    mocks.useLoaderData.mockReturnValue({ grant, offers: [offer] });
    mocks.useSearch.mockReturnValue({ returnTo: 'https://evil.example/phish' });
    // Rejecting keeps the plan picker mounted; the call arguments are the
    // subject here, not the Stripe iframe.
    mocks.startCheckout.mockRejectedValue(new Error('checkout unavailable'));

    await renderAccessPage();
    fireEvent.click(screen.getByRole('button', { name: 'Choose' }));

    await waitFor(() => {
      expect(mocks.startCheckout).toHaveBeenCalledWith({
        data: { offerKey: 'monthly', returnPath: '/account/access' },
      });
    });
  });

  it('carries the captured destination into the billing-portal return path', async () => {
    mocks.useLoaderData.mockReturnValue({
      grant: {
        ...grant,
        hasAccess: true,
        status: 'active',
        offerType: 'recurring',
      },
      offers: [],
    });
    mocks.useSearch.mockReturnValue({ returnTo: '/jobs?q=react' });
    mocks.openBillingPortal.mockResolvedValue({
      url: 'https://billing.example/session',
    });

    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: { href: '' },
    });

    await renderAccessPage();
    fireEvent.click(
      screen.getByRole('button', { name: 'Manage subscription' }),
    );

    await waitFor(() => {
      expect(mocks.openBillingPortal).toHaveBeenCalledWith({
        data: { returnPath: '/account/access?returnTo=%2Fjobs%3Fq%3Dreact' },
      });
    });

    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: originalLocation,
    });
  });

  it('opens the billing portal for a recurring subscription', async () => {
    mocks.useLoaderData.mockReturnValue({
      grant: {
        ...grant,
        hasAccess: true,
        status: 'active',
        offerType: 'recurring',
      },
      offers: [],
    });
    mocks.useSearch.mockReturnValue({ session_id: undefined });
    mocks.openBillingPortal.mockResolvedValue({
      url: 'https://billing.example/session',
    });

    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: { href: '' },
    });

    await renderAccessPage();
    fireEvent.click(
      screen.getByRole('button', { name: 'Manage subscription' }),
    );

    await waitFor(() => {
      expect(mocks.openBillingPortal).toHaveBeenCalledWith({
        data: { returnPath: '/account/access' },
      });
      expect(window.location.href).toBe('https://billing.example/session');
    });

    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: originalLocation,
    });
  });

  it('shows the lifetime entitlement with no billing portal', async () => {
    mocks.useLoaderData.mockReturnValue({
      grant: {
        ...grant,
        hasAccess: true,
        status: 'active',
        offerType: 'lifetime',
      },
      offers: [],
    });
    mocks.useSearch.mockReturnValue({ session_id: undefined });

    await renderAccessPage();

    // A lifetime grant cannot be managed via the portal, and it is an entitled
    // state rather than the plan picker.
    expect(
      screen.queryByRole('button', { name: 'Manage subscription' }),
    ).toBeNull();
    expect(screen.queryByRole('button', { name: 'Choose' })).toBeNull();
  });

  it('turns a rejected grant poll into an error toast with a refresh action', async () => {
    vi.useFakeTimers();
    mocks.useLoaderData.mockReturnValue({ grant, offers: [] });
    mocks.useSearch.mockReturnValue({
      session_id: 'checkout-session',
    });
    mocks.getAccessGrant.mockRejectedValue(new Error('grant unavailable'));

    await renderAccessPage();
    expect(screen.getByText('Confirming your purchase…')).toBeVisible();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(mocks.toastActionError).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeEnabled();
  });

  it('returns the buyer to the captured path once the grant is confirmed', async () => {
    mocks.useLoaderData.mockReturnValue({
      grant: {
        ...grant,
        hasAccess: true,
        status: 'active',
        offerType: 'recurring',
      },
      offers: [],
    });
    mocks.useSearch.mockReturnValue({
      session_id: 'checkout-session',
      returnTo: '/jobs?q=react',
    });

    await renderAccessPage();

    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledWith('/jobs?q=react');
    });
    // The bridge state shows instead of parking on the entitled surface.
    expect(
      screen.queryByRole('button', { name: 'Manage subscription' }),
    ).toBeNull();
  });

  it('ignores an unsafe returnTo and keeps the buyer on the entitled surface', async () => {
    mocks.useLoaderData.mockReturnValue({
      grant: {
        ...grant,
        hasAccess: true,
        status: 'active',
        offerType: 'recurring',
      },
      offers: [],
    });
    mocks.useSearch.mockReturnValue({
      session_id: 'checkout-session',
      returnTo: 'https://evil.example/phish',
    });

    await renderAccessPage();

    expect(mocks.navigate).not.toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: 'Manage subscription' }),
    ).toBeVisible();
  });
});

describe('accessReturnPath', () => {
  it('keeps this page as the return path when there is nothing to return to', () => {
    expect(accessReturnPath(null)).toBe('/account/access');
  });

  it('nests the captured destination so a hop away and back preserves it', () => {
    expect(accessReturnPath('/jobs')).toBe('/account/access?returnTo=%2Fjobs');
  });

  it.each([
    'https://evil.example/phish',
    '//evil.example',
    '/\\evil.example',
    '/account/access',
  ])('refuses %s as a captured destination', (value) => {
    expect(accessReturnPath(safeReturnTo(value))).toBe('/account/access');
  });
});
