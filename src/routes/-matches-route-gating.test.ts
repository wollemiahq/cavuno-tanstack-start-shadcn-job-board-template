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

const dependencies: MatchesLoaderDependencies = {
  getBoardContext,
  getRecommendedJobs,
  getSeoBase,
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
});
