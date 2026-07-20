// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AccessGrant, PaywallOffer } from '@cavuno/board';

const mocks = vi.hoisted(() => ({
  getAccessGrant: vi.fn(),
  getPaywallOffers: vi.fn(),
  invalidate: vi.fn(),
  openBillingPortal: vi.fn(),
  startCheckout: vi.fn(),
  toastActionError: vi.fn(),
}));

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@tanstack/react-router')>();
  return { ...actual, useRouter: () => ({ invalidate: mocks.invalidate }) };
});

// The route threads getSeoBase through its loader for the page title; the
// module resolves cloudflare:workers, so stub the seam for jsdom.
vi.mock('../server/queries', () => ({
  getSeoBase: vi.fn().mockResolvedValue({ boardName: 'Acme Board' }),
}));

vi.mock('../server/paywall', () => ({
  getAccessGrant: mocks.getAccessGrant,
  getPaywallOffers: mocks.getPaywallOffers,
  openBillingPortal: mocks.openBillingPortal,
  startCheckout: mocks.startCheckout,
}));

vi.mock('@/lib/action-toast', () => ({
  toastActionError: mocks.toastActionError,
  toastActionSuccess: vi.fn(),
}));

import { AccessPage, Route } from './account_.access';

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

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe('candidate access actions', () => {
  it('disables every offer while checkout is starting', async () => {
    vi.spyOn(Route, 'useLoaderData').mockReturnValue({
      grant,
      offers: [offer, annualOffer],
    });
    vi.spyOn(Route, 'useSearch').mockReturnValue({ session_id: undefined });
    let rejectCheckout!: (reason?: unknown) => void;
    mocks.startCheckout.mockImplementation(
      () =>
        new Promise((_, reject) => {
          rejectCheckout = reject;
        }),
    );

    render(<AccessPage />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Choose' })[0]!);

    for (const button of screen.getAllByRole('button')) {
      expect(button).toBeDisabled();
    }

    await act(async () => {
      rejectCheckout(new Error('checkout unavailable'));
    });
  });

  it('fires a recoverable error toast and re-enables checkout when session creation fails', async () => {
    vi.spyOn(Route, 'useLoaderData').mockReturnValue({
      grant,
      offers: [offer],
    });
    vi.spyOn(Route, 'useSearch').mockReturnValue({ session_id: undefined });
    mocks.startCheckout.mockRejectedValue(new Error('checkout unavailable'));

    render(<AccessPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Choose' }));

    await waitFor(() => {
      expect(mocks.toastActionError).toHaveBeenCalled();
      expect(screen.getByRole('button', { name: 'Choose' })).toBeEnabled();
    });
  });

  it('fires a recoverable error toast and re-enables the billing portal after failure', async () => {
    vi.spyOn(Route, 'useLoaderData').mockReturnValue({
      grant: {
        ...grant,
        hasAccess: true,
        status: 'active',
        offerType: 'recurring',
      },
      offers: [],
    });
    vi.spyOn(Route, 'useSearch').mockReturnValue({ session_id: undefined });
    mocks.openBillingPortal.mockRejectedValue(new Error('portal unavailable'));

    render(<AccessPage />);
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

  it('renders a plan option per offer for a viewer without access', () => {
    vi.spyOn(Route, 'useLoaderData').mockReturnValue({
      grant,
      offers: [offer, annualOffer],
    });
    vi.spyOn(Route, 'useSearch').mockReturnValue({ session_id: undefined });

    render(<AccessPage />);

    expect(screen.getAllByRole('button', { name: 'Choose' })).toHaveLength(2);
    expect(
      screen.queryByRole('button', { name: 'Manage subscription' }),
    ).toBeNull();
  });

  it('opens the billing portal for a recurring subscription', async () => {
    vi.spyOn(Route, 'useLoaderData').mockReturnValue({
      grant: {
        ...grant,
        hasAccess: true,
        status: 'active',
        offerType: 'recurring',
      },
      offers: [],
    });
    vi.spyOn(Route, 'useSearch').mockReturnValue({ session_id: undefined });
    mocks.openBillingPortal.mockResolvedValue({
      url: 'https://billing.example/session',
    });

    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: { href: '' },
    });

    render(<AccessPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Manage subscription' }));

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

  it('shows the lifetime entitlement with no billing portal', () => {
    vi.spyOn(Route, 'useLoaderData').mockReturnValue({
      grant: {
        ...grant,
        hasAccess: true,
        status: 'active',
        offerType: 'lifetime',
      },
      offers: [],
    });
    vi.spyOn(Route, 'useSearch').mockReturnValue({ session_id: undefined });

    render(<AccessPage />);

    // A lifetime grant cannot be managed via the portal, and it is an entitled
    // state rather than the plan picker.
    expect(
      screen.queryByRole('button', { name: 'Manage subscription' }),
    ).toBeNull();
    expect(screen.queryByRole('button', { name: 'Choose' })).toBeNull();
  });

  it('turns a rejected grant poll into an error toast with a refresh action', async () => {
    vi.useFakeTimers();
    vi.spyOn(Route, 'useLoaderData').mockReturnValue({ grant, offers: [] });
    vi.spyOn(Route, 'useSearch').mockReturnValue({
      session_id: 'checkout-session',
    });
    mocks.getAccessGrant.mockRejectedValue(new Error('grant unavailable'));

    render(<AccessPage />);
    expect(screen.getByText('Confirming your purchase…')).toBeVisible();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(mocks.toastActionError).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeEnabled();
  });
});
