// @vitest-environment jsdom

import {
  isNotFound as isRouteNotFound,
  isRedirect,
} from '@tanstack/react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createMatchesLoader, type MatchesLoaderDependencies } from './matches';

const getBoardContext = vi.fn<MatchesLoaderDependencies['getBoardContext']>();
const getRecommendedJobs =
  vi.fn<MatchesLoaderDependencies['getRecommendedJobs']>();
const getSeoBase = vi.fn<MatchesLoaderDependencies['getSeoBase']>();
const getPaywallOffers = vi.fn<MatchesLoaderDependencies['getPaywallOffers']>();

const dependencies: MatchesLoaderDependencies = {
  getBoardContext,
  getRecommendedJobs,
  getSeoBase,
  getPaywallOffers,
};

beforeEach(() => {
  getBoardContext.mockResolvedValue({
    features: { jobRecommendationsEnabled: true },
  });
  getRecommendedJobs.mockResolvedValue({
    object: 'list',
    url: '/v1/me/recommended-jobs',
    data: [],
    hasMore: false,
    nextCursor: null,
    skillCount: 0,
    parseStatus: null,
    resume: {
      object: 'resume',
      parseStatus: null,
      parseFailureReason: null,
      parsedAt: null,
      keepResumeOnFile: false,
      hasResumeOnFile: false,
      file: null,
    },
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

describe('matches route — recommendations feature gate', () => {
  it('loads recommendations when the feature is on', async () => {
    const data = await createMatchesLoader(dependencies)();

    expect(data).toMatchObject({ data: [] });
    expect(getRecommendedJobs).toHaveBeenCalledOnce();
  });

  it('falls through to the authoritative API when the fresh context read fails', async () => {
    getBoardContext.mockRejectedValue(new Error('context unavailable'));

    const data = await createMatchesLoader(dependencies)();

    expect(data).toMatchObject({ data: [] });
    expect(getRecommendedJobs).toHaveBeenCalledOnce();
  });

  it('is not-found when recommendations are off, and never reads matches', async () => {
    getBoardContext.mockResolvedValue({
      features: { jobRecommendationsEnabled: false },
    });
    let outcome: unknown;
    try {
      await createMatchesLoader(dependencies)();
    } catch (error) {
      outcome = error;
    }

    expect(isRouteNotFound(outcome)).toBe(true);
    expect(getRecommendedJobs).not.toHaveBeenCalled();
    expect(getSeoBase).not.toHaveBeenCalled();
  });

  it('returns unauthenticated visitors to matches after sign-in', async () => {
    getRecommendedJobs.mockRejectedValue(new Error('UNAUTHENTICATED'));
    let outcome: unknown;
    try {
      await createMatchesLoader(dependencies)();
    } catch (error) {
      outcome = error;
    }

    expect(isRedirect(outcome)).toBe(true);
    if (!isRedirect(outcome)) return;
    expect(outcome.options).toMatchObject({
      to: '/auth/sign-in',
      search: { returnTo: '/matches' },
    });
  });

  it.each(['/matches?selectedJob=job-1', '/fr/matches?selectedJob=job-1'])(
    'preserves the complete matches return URL through auth: %s',
    async (href) => {
      getRecommendedJobs.mockRejectedValue(new Error('UNAUTHENTICATED'));
      let outcome: unknown;
      try {
        await createMatchesLoader(dependencies)({ location: { href } });
      } catch (error) {
        outcome = error;
      }

      expect(isRedirect(outcome)).toBe(true);
      if (!isRedirect(outcome)) return;
      expect(outcome.options).toMatchObject({
        to: '/auth/sign-in',
        search: { returnTo: href },
      });
    },
  );

  it('re-attaches cavuno_auth params when bouncing unverified visitors to verify-email', async () => {
    getRecommendedJobs.mockRejectedValue(new Error('EMAIL_UNVERIFIED'));
    const href = '/matches?cavuno_auth=login&cavuno_auth_method=password';
    let outcome: unknown;
    try {
      await createMatchesLoader(dependencies)({ location: { href } });
    } catch (error) {
      outcome = error;
    }

    expect(isRedirect(outcome)).toBe(true);
    if (!isRedirect(outcome)) return;
    expect(outcome.options).toMatchObject({
      to: '/auth/verify-email-required',
      search: {
        returnTo: href,
        cavuno_auth: 'login',
        cavuno_auth_method: 'password',
      },
    });
  });

  it('still redirects unauthenticated visitors when the context probe fails', async () => {
    getBoardContext.mockRejectedValue(new Error('context unavailable'));
    getRecommendedJobs.mockRejectedValue(new Error('UNAUTHENTICATED'));
    let outcome: unknown;
    try {
      await createMatchesLoader(dependencies)();
    } catch (error) {
      outcome = error;
    }

    expect(isRedirect(outcome)).toBe(true);
    if (!isRedirect(outcome)) return;
    expect(outcome.options).toMatchObject({
      to: '/auth/sign-in',
      search: { returnTo: '/matches' },
    });
  });
});

describe('matches route — job-seeker plan gate', () => {
  it('renders the plan lock instead of the list when the board refuses with 403', async () => {
    // The API answers `candidate_paywall_access_required`; the server function
    // rethrows it as the boundary signal the candidate loaders read.
    getRecommendedJobs.mockRejectedValue(
      new Error('CANDIDATE_PAYWALL_ACCESS_REQUIRED'),
    );
    getPaywallOffers.mockResolvedValue({
      object: 'list',
      url: '/v1/paywall/offers',
      data: [
        {
          object: 'paywall_offer',
          offerKey: 'monthly',
          label: 'Monthly',
          billingLabel: 'per month',
          amountCents: 900,
          currency: 'usd',
          offerType: 'recurring',
          intervalUnit: 'month',
          intervalCount: 1,
          isDefault: true,
        },
      ],
      hasMore: false,
      nextCursor: null,
    });

    const data = await createMatchesLoader(dependencies)();

    expect(data).toMatchObject({ locked: true });
    expect(data.locked && data.offers).toHaveLength(1);
  });

  it('does not sign the viewer out when their plan is what is missing', async () => {
    getRecommendedJobs.mockRejectedValue(
      new Error('CANDIDATE_PAYWALL_ACCESS_REQUIRED'),
    );

    const data = await createMatchesLoader(dependencies)();

    expect(data).toMatchObject({ locked: true });
  });

  it('keeps the recommendations unlocked when the board does not refuse', async () => {
    const data = await createMatchesLoader(dependencies)();

    expect(data).toMatchObject({ locked: false, data: [] });
    expect(getPaywallOffers).not.toHaveBeenCalled();
  });
});
