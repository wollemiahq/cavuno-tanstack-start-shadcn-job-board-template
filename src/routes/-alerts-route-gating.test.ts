// @vitest-environment jsdom

import { isRedirect } from '@tanstack/react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAlertsLoader, type AlertsLoaderDependencies } from './me.alerts';

import type { Alert } from '@cavuno/board';

const getMyAlerts = vi.fn<AlertsLoaderDependencies['getMyAlerts']>();
const searchPlaces = vi.fn<AlertsLoaderDependencies['searchPlaces']>();
const getSeoBase = vi.fn<AlertsLoaderDependencies['getSeoBase']>();
const getPaywallOffers = vi.fn<AlertsLoaderDependencies['getPaywallOffers']>();
const getAnchorJobPaths =
  vi.fn<AlertsLoaderDependencies['getAnchorJobPaths']>();
const dependencies: AlertsLoaderDependencies = {
  getMyAlerts,
  getAnchorJobPaths,
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
    expect(getAnchorJobPaths).not.toHaveBeenCalled();
  });

  it('resolves similar-job anchor links, and shows the alerts unlinked if that fails', async () => {
    const similar = {
      id: 'alert-similar',
      object: 'alert',
      label: null,
      frequency: 'weekly',
      isActive: true,
      kind: 'similar_job',
      anchorJob: { id: 'job-1', slug: 'senior-chef', title: 'Senior chef' },
      filters: {
        query: null,
        jobFunctions: [],
        seniorityLevels: [],
        remoteOptions: [],
        placeIds: [],
        salaryMin: null,
        salaryMax: null,
        salaryCurrency: null,
      },
      lastSentAt: null,
    } satisfies Alert;
    getMyAlerts.mockResolvedValue({
      object: 'list',
      url: '/v1/me/alerts',
      data: [similar, { ...similar, id: 'alert-similar-2' }],
      hasMore: false,
      nextCursor: null,
    });
    getAnchorJobPaths.mockResolvedValue({
      'senior-chef': '/companies/acme/jobs/senior-chef',
    });

    const data = await createAlertsLoader(dependencies)({ location });
    expect(getAnchorJobPaths).toHaveBeenCalledExactlyOnceWith({
      data: { jobSlugs: ['senior-chef'] },
    });
    expect(data).toMatchObject({
      anchorJobPaths: { 'senior-chef': '/companies/acme/jobs/senior-chef' },
    });

    getAnchorJobPaths.mockRejectedValue(new Error('jobs unavailable'));
    const fallback = await createAlertsLoader(dependencies)({ location });
    expect(fallback).toMatchObject({ locked: false, anchorJobPaths: {} });
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
