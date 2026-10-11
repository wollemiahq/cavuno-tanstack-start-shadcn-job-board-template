/**
 * Page-based pagination math + the `?page=` URL contract. These
 * lock the WHY, not the widget: the listing loaders turn a 1-based `?page=N`
 * into a zero-based API `offset`, page 1 serialises to a CLEAN URL (the param
 * drops), invalid/`<1` input coerces to page 1 (listing URLs are public input,
 * never throw), and the pagination nav only shows once there is a second page.
 */
import {
  defaultParseSearch,
  defaultStringifySearch,
} from '@tanstack/react-router';
import { describe, expect, it, vi } from 'vitest';

import {
  clampPage,
  cursorPageHref,
  cursorSearchValue,
  lastReachablePage,
  listingPageHref,
  MAX_OFFSET_WINDOW,
  pageSearchValue,
  pageToOffset,
  parsePageParam,
  isLastReachablePage,
  isPreviewUnlockPage,
  pageableCount,
  reachableCountOf,
  readReachablePage,
  shouldRenderPagination,
  totalPages,
} from './pagination';

function parsedCursor(search: string): string | number | undefined {
  const parsed: { cursor?: string | number } = defaultParseSearch(search);
  return parsed.cursor;
}

describe('listingPageHref (crawlable pagination URLs)', () => {
  it('preserves filters while replacing transient selection state', () => {
    expect(
      listingPageHref('/jobs?q=robotics&selectedJob=old&page=2', 3, [
        'selectedJob',
      ]),
    ).toBe('/jobs?q=robotics&page=3');
  });

  it('keeps page one canonical by removing the page parameter', () => {
    expect(listingPageHref('/companies?market=robotics&page=2', 1)).toBe(
      '/companies?market=robotics',
    );
  });
});

describe('cursorPageHref (crawlable next-cursor URLs for cursor-only listings)', () => {
  it('sets the opaque cursor and drops the numbered page param', () => {
    expect(cursorPageHref('/blog?cursor=old', 'opaque:page:2')).toBe(
      '/blog?cursor=opaque%3Apage%3A2',
    );
    expect(cursorPageHref('/talent?page=3', 'next')).toBe(
      '/talent?cursor=next',
    );
  });

  it('preserves active filters while replacing transient selection state', () => {
    expect(
      cursorPageHref('/talent?q=react&selectedTalent=old&cursor=a', 'b', [
        'selectedTalent',
      ]),
    ).toBe('/talent?q=react&cursor=b');
  });

  it('JSON-encodes a numeric-looking cursor so the href is router-canonical', () => {
    // The list endpoint mints cursors like "2". `URLSearchParams` would emit a
    // bare `cursor=2`, which the router re-parses as the NUMBER 2, drops on the
    // string guard, and 307-redirects back to the bare archive — a dead link.
    // The router's own codec quotes it, so a direct GET SSRs the cursor page.
    expect(cursorPageHref('/blog', '2')).toBe('/blog?cursor=%222%22');
  });

  it('emits a href that survives the router parse → validate round-trip', () => {
    // The whole crawlability contract: whatever the Next anchor points at must
    // re-parse (and pass `cursorSearchValue`) back to the SAME cursor, so a
    // crawler or new-tab open lands on the cursor page instead of page one.
    for (const cursor of ['2', 'opaque:page:2', 'kn7abc', '1.5']) {
      const href = cursorPageHref('/blog', cursor);
      const parsed = parsedCursor(new URL(href, 'https://b.local').search);
      expect(cursorSearchValue(parsed)).toBe(cursor);
    }
  });
});

describe('cursorSearchValue (opaque-cursor coercion)', () => {
  it('keeps a string cursor as-is', () => {
    expect(cursorSearchValue('next-token')).toBe('next-token');
  });

  it('coerces a numeric cursor (router-parsed as a number) back to a string', () => {
    // `?cursor=2` parses to the number 2 before validateSearch sees it; without
    // coercion the string guard drops it and the page 307s to the archive.
    expect(cursorSearchValue(2)).toBe('2');
    expect(cursorSearchValue(1.5)).toBe('1.5');
  });

  it('drops empty, null, boolean, and non-finite values', () => {
    expect(cursorSearchValue('')).toBeUndefined();
    expect(cursorSearchValue(null)).toBeUndefined();
    expect(cursorSearchValue(undefined)).toBeUndefined();
    expect(cursorSearchValue(true)).toBeUndefined();
    expect(cursorSearchValue(Number.NaN)).toBeUndefined();
  });

  it('round-trips a numeric cursor through the router codec without loss', () => {
    // Emit the way `cursorPageHref` does, then read it the way the route does.
    const href = defaultStringifySearch({ cursor: '2' });
    expect(cursorSearchValue(parsedCursor(href))).toBe('2');
  });
});

describe('parsePageParam (public-input coercion)', () => {
  it('reads a valid 1-based page from a string param', () => {
    expect(parsePageParam('3')).toBe(3);
  });

  it('reads a numeric page as-is', () => {
    expect(parsePageParam(2)).toBe(2);
  });

  it('coerces a missing param to page 1', () => {
    expect(parsePageParam(undefined)).toBe(1);
  });

  it('coerces zero and negatives to page 1', () => {
    expect(parsePageParam('0')).toBe(1);
    expect(parsePageParam('-4')).toBe(1);
  });

  it('coerces non-numeric junk to page 1', () => {
    expect(parsePageParam('abc')).toBe(1);
    expect(parsePageParam('')).toBe(1);
  });

  it('coerces a non-integer page to page 1', () => {
    // Fractional pages have no offset meaning — collapse to the first page.
    expect(parsePageParam('2.5')).toBe(1);
  });
});

describe('pageSearchValue (clean page-1 URL)', () => {
  it('drops page 1 so the URL carries no ?page=1', () => {
    // undefined ⇒ TanStack strips the search param entirely.
    expect(pageSearchValue(1)).toBeUndefined();
  });

  it('keeps page 2 and beyond', () => {
    expect(pageSearchValue(2)).toBe(2);
    expect(pageSearchValue(7)).toBe(7);
  });

  it('round-trips through parse: page 1 and invalid input both strip', () => {
    // The validateSearch contract: canonicalise the URL for the first page
    // AND for any junk a hand-typed URL might carry.
    expect(pageSearchValue(parsePageParam('1'))).toBeUndefined();
    expect(pageSearchValue(parsePageParam('abc'))).toBeUndefined();
    expect(pageSearchValue(parsePageParam('3'))).toBe(3);
  });
});

describe('pageToOffset (1-based page ⇒ 0-based API offset)', () => {
  it('maps page 1 to offset 0', () => {
    expect(pageToOffset(1, 20)).toBe(0);
  });

  it('maps later pages by the page size', () => {
    expect(pageToOffset(2, 20)).toBe(20);
    expect(pageToOffset(3, 24)).toBe(48);
  });

  it('never asks the API for a window past its deep-offset ceiling', () => {
    // `?page=` is public input. The API 400s any `offset + limit` beyond
    // MAX_OFFSET_WINDOW, and an uncaught 400 in a loader is a 500 page —
    // live, `/jobs?page=600` crashed while `?page=500` rendered. Deeper
    // pages collapse onto the last page that still fits.
    for (const pageSize of [20, 24, 12]) {
      const last = lastReachablePage(pageSize);
      expect(pageToOffset(last, pageSize) + pageSize).toBeLessThanOrEqual(
        MAX_OFFSET_WINDOW,
      );
      expect(pageToOffset(last + 1, pageSize)).toBe(
        pageToOffset(last, pageSize),
      );
      expect(pageToOffset(2000, pageSize)).toBe(pageToOffset(last, pageSize));
    }
    expect(lastReachablePage(20)).toBe(500);
    expect(pageToOffset(600, 20)).toBe(9980);
  });
});

describe('clampPage (page ⇒ API-reachable page)', () => {
  it('keeps in-range pages and folds deeper ones onto the last reachable page', () => {
    expect(clampPage(1, 20)).toBe(1);
    expect(clampPage(500, 20)).toBe(500);
    expect(clampPage(501, 20)).toBe(500);
    expect(clampPage(2000, 24)).toBe(416);
  });
});

describe('totalPages (ceil of count / pageSize)', () => {
  it('is a single page when the count fits', () => {
    expect(totalPages(12, 20)).toBe(1);
    expect(totalPages(20, 20)).toBe(1);
  });

  it('rounds a partial final page up', () => {
    expect(totalPages(21, 20)).toBe(2);
    expect(totalPages(41, 20)).toBe(3);
  });

  it('is zero pages for an empty result set', () => {
    expect(totalPages(0, 20)).toBe(0);
  });

  it('caps the nav at the last API-reachable page', () => {
    // A listing with more results than the API will ever page through must
    // not render links into the 400. 12,000 jobs at 20 a page is 600 pages,
    // but only 500 fit under the ceiling.
    expect(totalPages(12_000, 20)).toBe(500);
    expect(totalPages(12_000, 24)).toBe(416);
  });
});

describe('isPreviewUnlockPage', () => {
  it('is only the final page of a multi-page preview', () => {
    expect(isPreviewUnlockPage(1, 20, 30)).toBe(false);
    expect(isPreviewUnlockPage(2, 20, 30)).toBe(true);
    expect(isPreviewUnlockPage(3, 20, 30)).toBe(false);
  });

  it('unlocks page 1 of a one-page preview, and not an empty preview', () => {
    expect(isPreviewUnlockPage(1, 20, 1)).toBe(true);
    expect(isPreviewUnlockPage(1, 20, 0)).toBe(false);
    expect(isPreviewUnlockPage(2, 20, 0)).toBe(false);
  });
});

describe('shouldRenderPagination (only past the first page)', () => {
  it('hides the nav for a single page or fewer', () => {
    expect(shouldRenderPagination(0, 20)).toBe(false);
    expect(shouldRenderPagination(12, 20)).toBe(false);
    expect(shouldRenderPagination(20, 20)).toBe(false);
  });

  it('shows the nav once a second page exists', () => {
    expect(shouldRenderPagination(21, 20)).toBe(true);
    expect(shouldRenderPagination(100, 24)).toBe(true);
  });
});

describe('reachable depth (a keyword search that matches past its deepest page)', () => {
  it('reads reachableCount defensively from a response', () => {
    expect(reachableCountOf({ count: 4935, reachableCount: 1000 })).toBe(1000);
    expect(reachableCountOf({ count: 40 })).toBeUndefined();
    expect(reachableCountOf({ reachableCount: '1000' })).toBeUndefined();
    expect(reachableCountOf({ reachableCount: Number.NaN })).toBeUndefined();
    expect(reachableCountOf({ reachableCount: -1 })).toBeUndefined();
    expect(reachableCountOf(null)).toBeUndefined();
  });

  it('pages the reachable matches while the count stays the full total', () => {
    expect(pageableCount(4935, 1000)).toBe(1000);
    expect(pageableCount(4935)).toBe(4935);
    expect(totalPages(4935, 20, 1000)).toBe(50);
    expect(shouldRenderPagination(4935, 20, 1000)).toBe(true);
  });

  it('leaves listings without a reachable depth unchanged', () => {
    expect(totalPages(4935, 20)).toBe(247);
    expect(totalPages(4935, 20, undefined)).toBe(247);
    expect(clampPage(60, 20)).toBe(60);
    expect(pageToOffset(60, 20)).toBe(1180);
  });

  it('clamps a page past the reachable depth onto the last reachable page', () => {
    expect(clampPage(50, 20, 1000)).toBe(50);
    expect(clampPage(60, 20, 1000)).toBe(50);
    expect(pageToOffset(60, 20, 1000)).toBe(980);
    expect(clampPage(3, 20, 0)).toBe(1);
  });

  it('marks only the last page of a capped search', () => {
    expect(isLastReachablePage(50, 20, 4935, 1000)).toBe(true);
    expect(isLastReachablePage(49, 20, 4935, 1000)).toBe(false);
    expect(isLastReachablePage(50, 20, 1000, undefined)).toBe(false);
    expect(isLastReachablePage(50, 20, 1000, 1000)).toBe(false);
  });

  it('re-reads the last reachable page for a page past the depth', async () => {
    const read = vi.fn(async (offset: number) => ({
      offset,
      count: 4935,
      reachableCount: 1000,
    }));
    const page = await readReachablePage(1180, 20, read);
    expect(read.mock.calls.map(([offset]) => offset)).toEqual([1180, 980]);
    expect(page.offset).toBe(980);
  });

  it('reads an in-range page once', async () => {
    const read = vi.fn(async (offset: number) => ({
      offset,
      count: 4935,
      reachableCount: 1000,
    }));
    await readReachablePage(980, 20, read);
    const uncapped = vi.fn(async (offset: number) => ({ offset, count: 4935 }));
    await readReachablePage(1180, 20, uncapped);
    expect(read).toHaveBeenCalledTimes(1);
    expect(uncapped).toHaveBeenCalledTimes(1);
  });
});
