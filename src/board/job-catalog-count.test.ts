import { describe, expect, it } from 'vitest';

import {
  catalogJobCount,
  displayedJobCount,
  isRelevanceCountCapped,
  visiblePageSpan,
} from './job-catalog-count';

describe('catalogJobCount', () => {
  it('adds a positive withheld count to the visible preview', () => {
    expect(catalogJobCount(30, 357)).toBe(387);
  });

  it('ignores a missing or non-positive withheld count', () => {
    expect(catalogJobCount(30, undefined)).toBe(30);
    expect(catalogJobCount(30, 0)).toBe(30);
  });
});

describe('visiblePageSpan', () => {
  it('returns the preview rows on a page that still has them', () => {
    expect(visiblePageSpan(2, 20, 30)).toEqual({ from: 21, to: 30 });
    expect(visiblePageSpan(1, 20, 5)).toEqual({ from: 1, to: 5 });
  });

  it('returns nothing when the page starts past the preview', () => {
    expect(visiblePageSpan(3, 20, 30)).toBeNull();
  });
});

describe('isRelevanceCountCapped', () => {
  it('caps a relevance-ordered text query that reaches the limit', () => {
    expect(
      isRelevanceCountCapped({
        hasTextQuery: true,
        sort: undefined,
        count: 1000,
      }),
    ).toBe(true);
    expect(
      isRelevanceCountCapped({
        hasTextQuery: true,
        sort: 'relevance',
        count: 1000,
      }),
    ).toBe(true);
  });

  it('keeps a browse with exactly the limit exact', () => {
    expect(
      isRelevanceCountCapped({
        hasTextQuery: false,
        sort: undefined,
        count: 1000,
      }),
    ).toBe(false);
  });

  it('keeps an explicitly sorted search exact', () => {
    expect(
      isRelevanceCountCapped({
        hasTextQuery: true,
        sort: 'newest',
        count: 1000,
      }),
    ).toBe(false);
  });

  it('keeps a search below the limit exact', () => {
    expect(
      isRelevanceCountCapped({
        hasTextQuery: true,
        sort: undefined,
        count: 999,
      }),
    ).toBe(false);
  });
});

describe('displayedJobCount', () => {
  it('shows the limit, not limit plus withheld jobs, when capped', () => {
    expect(displayedJobCount(1000, 40, true)).toBe(1000);
    expect(displayedJobCount(1000, 40, false)).toBe(1040);
  });
});
