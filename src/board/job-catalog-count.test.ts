import { describe, expect, it } from 'vitest';

import { catalogJobCount, visiblePageSpan } from './job-catalog-count';

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
