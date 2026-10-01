// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { StrictMode, useState } from 'react';

import {
  act,
  cleanup,
  fireEvent,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { m } from '@/paraglide/messages';
import { renderRouted } from '@/test/render-routed';
import type {
  AccessCheckoutSession,
  AccessGrant,
  PaywallOffer,
} from '@cavuno/board';

vi.mock('../components/paywall/embedded-checkout', () => ({
  EmbeddedCheckout: ({ kit }: { kit: AccessCheckoutSession }) => (
    <div
      data-testid="paywall-embedded-checkout"
      data-session-id={kit.sessionId}
    />
  ),
}));

interface AccessLoaderData {
  grant: AccessGrant;
  offers: (PaywallOffer & { benefits?: string[] })[];
}

interface AccessSearch {
  session_id?: string;
  returnTo?: string;
  offerKey?: string;
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
      offerKey={search.offerKey}
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
  it('starts the selected current offer directly and mounts its checkout', async () => {
    mocks.useLoaderData.mockReturnValue({
      grant,
      offers: [offer, annualOffer],
    });
    mocks.useSearch.mockReturnValue({
      offerKey: 'annual',
      returnTo: '/matches',
    });
    mocks.startCheckout.mockResolvedValue({ sessionId: 'cs_selected' });

    await renderAccessPage();

    await waitFor(() => {
      expect(screen.getByTestId('paywall-embedded-checkout')).toHaveAttribute(
        'data-session-id',
        'cs_selected',
      );
    });
    expect(mocks.startCheckout).toHaveBeenCalledExactlyOnceWith({
      data: {
        offerKey: 'annual',
        returnPath: '/account/access?returnTo=%2Fmatches',
      },
    });
    expect(
      screen.queryByRole('button', { name: m.accountAccess_chooseLabel() }),
    ).toBeNull();

    fireEvent.click(
      screen.getByRole('button', { name: m.accountAccess_backToPlansLabel() }),
    );
    await waitFor(() =>
      expect(
        screen.getAllByRole('button', { name: m.accountAccess_chooseLabel() }),
      ).toHaveLength(2),
    );
    expect(mocks.startCheckout).toHaveBeenCalledTimes(1);
  });

  it('keeps the picker for an unknown or retired offer without starting checkout', async () => {
    mocks.useLoaderData.mockReturnValue({
      grant,
      offers: [offer, annualOffer],
    });
    mocks.useSearch.mockReturnValue({ offerKey: 'ANNUAL' });

    await renderAccessPage();

    expect(
      screen.getAllByRole('button', { name: m.accountAccess_chooseLabel() }),
    ).toHaveLength(2);
    expect(mocks.startCheckout).not.toHaveBeenCalled();
  });

  it.each(['entitled', 'payment-return'] as const)(
    'does not start a selected offer in the %s state',
    async (state) => {
      mocks.useLoaderData.mockReturnValue({
        grant: state === 'entitled' ? { ...grant, hasAccess: true } : grant,
        offers: [offer, annualOffer],
      });
      const search: AccessSearch = { offerKey: 'annual' };
      if (state === 'payment-return') search.session_id = 'cs_returned';
      mocks.useSearch.mockReturnValue(search);

      await renderAccessPage();

      expect(mocks.startCheckout).not.toHaveBeenCalled();
    },
  );

  it('attempts direct checkout once through effect replay, rejection and new render callbacks', async () => {
    mocks.startCheckout.mockRejectedValue(new Error('checkout unavailable'));
    let refresh = () => {};
    function RefreshablePage() {
      const [, setRevision] = useState(0);
      refresh = () => setRevision((revision) => revision + 1);
      return (
        <AccessPageView
          grant={{ ...grant }}
          offers={[{ ...offer }, { ...annualOffer }]}
          offerKey="annual"
          getAccessGrantAction={mocks.getAccessGrant}
          openBillingPortalAction={mocks.openBillingPortal}
          startCheckoutAction={(input) => mocks.startCheckout(input)}
          invalidate={async () => {}}
          navigate={async () => {}}
          reportActionError={() => mocks.toastActionError()}
        />
      );
    }
    await renderRouted(
      <StrictMode>
        <RefreshablePage />
      </StrictMode>,
    );

    await waitFor(() =>
      expect(mocks.toastActionError).toHaveBeenCalledTimes(1),
    );
    await act(async () => refresh());

    expect(mocks.startCheckout).toHaveBeenCalledTimes(1);
    expect(
      screen.getAllByRole('button', { name: m.accountAccess_chooseLabel() }),
    ).toHaveLength(2);
    // A fresh click remains an explicit retry after the failed automatic start.
    fireEvent.click(
      screen.getAllByRole('button', {
        name: m.accountAccess_chooseLabel(),
      })[1]!,
    );
    await waitFor(() => expect(mocks.startCheckout).toHaveBeenCalledTimes(2));
  });

  it('does not consume a new selection while a previous checkout start is in flight', async () => {
    let rejectCheckout: (reason: Error) => void = () => {
      throw new Error('Checkout rejection was not initialized');
    };
    mocks.startCheckout
      .mockImplementationOnce(
        () =>
          new Promise((_, reject) => {
            rejectCheckout = reject;
          }),
      )
      .mockRejectedValue(new Error('checkout unavailable'));
    let selectAnnual = () => {};
    function ChangingSelection() {
      const [selectedKey, setSelectedKey] = useState('monthly');
      selectAnnual = () => setSelectedKey('annual');
      return (
        <AccessPageView
          grant={grant}
          offers={[offer, annualOffer]}
          offerKey={selectedKey}
          getAccessGrantAction={mocks.getAccessGrant}
          openBillingPortalAction={mocks.openBillingPortal}
          startCheckoutAction={mocks.startCheckout}
          invalidate={mocks.invalidate}
          navigate={mocks.navigate}
          reportActionError={mocks.toastActionError}
        />
      );
    }
    await renderRouted(<ChangingSelection />);
    await act(async () => selectAnnual());
    expect(mocks.startCheckout).toHaveBeenCalledTimes(1);

    await act(async () => rejectCheckout(new Error('checkout unavailable')));

    await waitFor(() => expect(mocks.startCheckout).toHaveBeenCalledTimes(2));
    expect(mocks.startCheckout).toHaveBeenNthCalledWith(2, {
      data: { offerKey: 'annual', returnPath: '/account/access' },
    });
  });

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
    fireEvent.click(
      screen.getAllByRole('button', {
        name: m.accountAccess_chooseLabel(),
      })[0]!,
    );

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
    fireEvent.click(
      screen.getByRole('button', { name: m.accountAccess_chooseLabel() }),
    );

    await waitFor(() => {
      expect(mocks.toastActionError).toHaveBeenCalled();
      expect(
        screen.getByRole('button', { name: m.accountAccess_chooseLabel() }),
      ).toBeEnabled();
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
      screen.getByRole('button', {
        name: m.accountAccess_manageSubscriptionLabel(),
      }),
    );

    await waitFor(() => {
      expect(mocks.toastActionError).toHaveBeenCalled();
      expect(
        screen.getByRole('button', {
          name: m.accountAccess_manageSubscriptionLabel(),
        }),
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

    expect(
      screen.getAllByRole('button', { name: m.accountAccess_chooseLabel() }),
    ).toHaveLength(2);
    expect(
      screen.queryByRole('button', {
        name: m.accountAccess_manageSubscriptionLabel(),
      }),
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
    fireEvent.click(
      screen.getByRole('button', { name: m.accountAccess_chooseLabel() }),
    );

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
    fireEvent.click(
      screen.getByRole('button', { name: m.accountAccess_chooseLabel() }),
    );

    await waitFor(() => {
      expect(mocks.startCheckout).toHaveBeenCalledWith({
        data: { offerKey: 'monthly', returnPath: '/account/access' },
      });
    });
  });

  it('bounces the buyer to the destination once Stripe returns with a session id', async () => {
    // The redirect-based return: `?returnTo=…&session_id=…` with the grant
    // already active. This is the combination the nested return path makes
    // reachable, so it is pinned here.
    mocks.useLoaderData.mockReturnValue({
      grant: { ...grant, hasAccess: true },
      offers: [offer],
    });
    mocks.useSearch.mockReturnValue({ returnTo: '/jobs', session_id: 'cs_x' });

    await renderAccessPage();

    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith('/jobs'));
    expect(mocks.navigate).toHaveBeenCalledTimes(1);
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
    // A captured destination must NOT ride the portal return: nothing on the
    // page consumes it without a session id.
    mocks.useSearch.mockReturnValue({
      session_id: undefined,
      returnTo: '/jobs',
    });
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
      screen.getByRole('button', {
        name: m.accountAccess_manageSubscriptionLabel(),
      }),
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
      screen.queryByRole('button', {
        name: m.accountAccess_manageSubscriptionLabel(),
      }),
    ).toBeNull();
    expect(
      screen.queryByRole('button', { name: m.accountAccess_chooseLabel() }),
    ).toBeNull();
  });

  it('turns a rejected grant poll into an error toast with a refresh action', async () => {
    vi.useFakeTimers();
    mocks.useLoaderData.mockReturnValue({ grant, offers: [] });
    mocks.useSearch.mockReturnValue({
      session_id: 'checkout-session',
    });
    mocks.getAccessGrant.mockRejectedValue(new Error('grant unavailable'));

    await renderAccessPage();
    expect(screen.getByText(m.accountAccess_confirmingText())).toBeVisible();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(mocks.toastActionError).toHaveBeenCalled();
    expect(
      screen.getByRole('button', {
        name: m.accountAccess_refreshLabel(),
      }),
    ).toBeEnabled();
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
      screen.queryByRole('button', {
        name: m.accountAccess_manageSubscriptionLabel(),
      }),
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
      screen.getByRole('button', {
        name: m.accountAccess_manageSubscriptionLabel(),
      }),
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

  it('falls back to the bare page when the nested path would exceed the Stripe metadata cap', () => {
    const long = `/jobs?q=${'a'.repeat(500)}`;
    expect(accessReturnPath(long)).toBe('/account/access');
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

it('shows each offer’s configured benefits beside its checkout action', async () => {
  mocks.useLoaderData.mockReturnValue({
    grant,
    offers: [{ ...offer, benefits: ['Job matching', 'Job alerts'] }],
  });
  mocks.useSearch.mockReturnValue({});
  await renderAccessPage();
  expect(screen.getByRole('list')).toHaveTextContent('Job matching');
  expect(screen.getByRole('list')).toHaveTextContent('Job alerts');
  expect(
    screen.getByRole('button', { name: m.accountAccess_chooseLabel() }),
  ).toBeEnabled();
});
