// @vitest-environment jsdom

import { isRedirect } from '@tanstack/react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAlertsLoader, type AlertsLoaderDependencies } from './me.alerts';

const getMyAlerts = vi.fn<AlertsLoaderDependencies['getMyAlerts']>();
const searchPlaces = vi.fn<AlertsLoaderDependencies['searchPlaces']>();
const getSeoBase = vi.fn<AlertsLoaderDependencies['getSeoBase']>();
const getPaywallOffers = vi.fn<AlertsLoaderDependencies['getPaywallOffers']>();
const dependencies: AlertsLoaderDependencies = {
  getMyAlerts,
  searchPlaces,
  getSeoBase,
  getPaywallOffers,
};

beforeEach(() => {
  getMyAlerts.mockResolvedValue({
    object: 'list',
    url: '/v1/me/alerts',
    data: [],
    hasMore: false,
    nextCursor: null,
  });
  searchPlaces.mockResolvedValue({
    object: 'list',
    url: '/v1/places',
    data: [],
    hasMore: false,
    nextCursor: null,
  });
  getSeoBase.mockResolvedValue({ boardName: 'Acme Board' });
  getPaywallOffers.mockResolvedValue({
    object: 'list',
    url: '/v1/paywall/offers',
    data: [],
    hasMore: false,
    nextCursor: null,
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

const location = { href: '/me/alerts' };

describe('alerts route plan gate', () => {
  it('offers only plans that unlock alerts, preserving multiple eligible checkout keys', async () => {
    getMyAlerts.mockRejectedValue(
      new Error('CANDIDATE_PAYWALL_ACCESS_REQUIRED'),
    );
    const base = {
      object: 'paywall_offer' as const,
      label: 'Plan',
      billingLabel: 'per month',
      amountCents: 900,
      currency: 'usd',
      offerType: 'recurring' as const,
      intervalUnit: 'month',
      intervalCount: 1,
    };
    getPaywallOffers.mockResolvedValue({
      object: 'list',
      url: '/v1/paywall/offers',
      hasMore: false,
      nextCursor: null,
      data: [
        {
          ...base,
          offerKey: 'matches',
          isDefault: true,
          entitlements: { listings: false, matches: true, job_alerts: false },
        },
        {
          ...base,
          offerKey: 'alerts',
          isDefault: false,
          entitlements: { listings: false, matches: false, job_alerts: true },
        },
        {
          ...base,
          offerKey: 'combined',
          isDefault: false,
          entitlements: { listings: true, matches: true, job_alerts: true },
        },
      ],
    });
    const data = await createAlertsLoader(dependencies)({ location });
    expect(data.locked && data.offers.map((row) => row.offerKey)).toEqual([
      'alerts',
      'combined',
    ]);
  });

  it('keeps the locked state when no published offer qualifies', async () => {
    getMyAlerts.mockRejectedValue(
      new Error('CANDIDATE_PAYWALL_ACCESS_REQUIRED'),
    );
    const data = await createAlertsLoader(dependencies)({ location });
    expect(data).toMatchObject({ locked: true, offers: [] });
  });

  it('loads existing alerts without reading paid offers when the API allows access', async () => {
    const data = await createAlertsLoader(dependencies)({ location });
    expect(data).toMatchObject({ locked: false, alerts: { data: [] } });
    expect(getPaywallOffers).not.toHaveBeenCalled();
  });

  it('returns unauthenticated visitors to their alerts after sign-in', async () => {
    getMyAlerts.mockRejectedValue(new Error('UNAUTHENTICATED'));
    let outcome: unknown;
    try {
      await createAlertsLoader(dependencies)({ location });
    } catch (error) {
      outcome = error;
    }
    expect(isRedirect(outcome)).toBe(true);
    if (!isRedirect(outcome)) return;
    expect(outcome.options).toMatchObject({
      to: '/auth/sign-in',
      search: { returnTo: '/me/alerts' },
    });
  });
});
