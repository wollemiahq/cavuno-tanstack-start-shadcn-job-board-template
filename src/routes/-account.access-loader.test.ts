/**
 * The `/account/access` loader's auth bounces. A gated visitor arrives with
 * `?returnTo=/jobs`; if the bounce to sign-in carries only this page's own
 * path, that listing is lost and the buyer lands back on a bare paywall.
 */
import { isRedirect } from '@tanstack/react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createAccessLoader,
  type AccessLoaderDependencies,
} from './account_.access';

const getAccessGrant = vi.fn<AccessLoaderDependencies['getAccessGrant']>();
const getPaywallOffers = vi.fn<AccessLoaderDependencies['getPaywallOffers']>();
const getSeoBase = vi.fn<AccessLoaderDependencies['getSeoBase']>();

const dependencies: AccessLoaderDependencies = {
  getAccessGrant,
  getPaywallOffers,
  getSeoBase,
};

const grant = {
  object: 'access_grant',
  hasAccess: false,
  status: null,
  offerType: null,
  offerKey: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
} as const;

const offers = {
  object: 'list' as const,
  url: '/v1/paywall/offers',
  data: [],
  hasMore: false,
  nextCursor: null,
};

const seo = {
  boardName: 'Acme Jobs',
  language: 'en',
  origin: 'https://example.com',
};

function runLoader(searchStr: string) {
  const search = Object.fromEntries(new URLSearchParams(searchStr));
  return createAccessLoader(dependencies)({
    location: { search, searchStr: searchStr ? `?${searchStr}` : '' },
  });
}

/** The bounce the loader threw, or a failure if it did not bounce. */
async function redirectFrom(searchStr: string) {
  const outcome = await runLoader(searchStr).then(
    () => null,
    (thrown: Error) => thrown,
  );
  if (!isRedirect(outcome)) throw new Error('The loader did not redirect');
  return outcome;
}

beforeEach(() => {
  vi.clearAllMocks();
  getPaywallOffers.mockResolvedValue(offers);
  getSeoBase.mockResolvedValue(seo);
});

describe('access loader auth bounces', () => {
  it('keeps the nested destination through the sign-in hop', async () => {
    getAccessGrant.mockRejectedValue(new Error('UNAUTHENTICATED'));

    const redirect = await redirectFrom('returnTo=%2Fjobs');

    expect(redirect.options.to).toBe('/auth/sign-in');
    expect(redirect.options.search).toEqual({
      returnTo: '/account/access?returnTo=%2Fjobs',
    });
  });

  it('keeps the nested destination through the verify-email hop', async () => {
    getAccessGrant.mockRejectedValue(new Error('EMAIL_UNVERIFIED'));

    const redirect = await redirectFrom('returnTo=%2Fjobs%3Fq%3Dreact');

    expect(redirect.options.to).toBe('/auth/verify-email-required');
    expect(redirect.options.search).toMatchObject({
      returnTo: '/account/access?returnTo=%2Fjobs%3Fq%3Dreact',
    });
  });

  it.each([
    ['UNAUTHENTICATED', '/auth/sign-in'],
    ['EMAIL_UNVERIFIED', '/auth/verify-email-required'],
  ])(
    'preserves the selected offer through %s',
    async (failure, destination) => {
      getAccessGrant.mockRejectedValue(new Error(failure));

      const redirect = await redirectFrom(
        'returnTo=%2Fmatches&offerKey=annual',
      );

      expect(redirect.options.to).toBe(destination);
      expect(redirect.options.search).toMatchObject({
        returnTo: '/account/access?returnTo=%2Fmatches&offerKey=annual',
      });
    },
  );

  it('preserves an offer selection while refusing an unsafe destination', async () => {
    getAccessGrant.mockRejectedValue(new Error('UNAUTHENTICATED'));

    const redirect = await redirectFrom(
      'offerKey=annual&returnTo=https%3A%2F%2Fevil.example',
    );

    expect(redirect.options.search).toEqual({
      returnTo: '/account/access?offerKey=annual',
    });
  });

  it('preserves payment-return state through auth so it cannot restart the selected checkout', async () => {
    getAccessGrant.mockRejectedValue(new Error('UNAUTHENTICATED'));

    const redirect = await redirectFrom(
      'offerKey=annual&returnTo=%2Fmatches&session_id=cs_returned',
    );

    expect(redirect.options.search).toEqual({
      returnTo:
        '/account/access?returnTo=%2Fmatches&offerKey=annual&session_id=cs_returned',
    });
  });

  it('bounces to this page alone when no destination was captured', async () => {
    getAccessGrant.mockRejectedValue(new Error('UNAUTHENTICATED'));

    const redirect = await redirectFrom('');

    expect(redirect.options.search).toEqual({ returnTo: '/account/access' });
  });

  it('refuses an off-origin captured destination', async () => {
    getAccessGrant.mockRejectedValue(new Error('UNAUTHENTICATED'));

    const redirect = await redirectFrom(
      `returnTo=${encodeURIComponent('https://evil.example/phish')}`,
    );

    expect(redirect.options.search).toEqual({ returnTo: '/account/access' });
  });

  it('loads the entitlement and offers for a signed-in viewer', async () => {
    getAccessGrant.mockResolvedValue(grant);

    await expect(runLoader('returnTo=%2Fjobs')).resolves.toMatchObject({
      grant,
      offers: [],
    });
  });
});
