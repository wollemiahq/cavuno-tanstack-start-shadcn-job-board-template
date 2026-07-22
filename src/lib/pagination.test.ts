/**
 * Page-based pagination math + the `?page=` URL contract (CAV-496). These
 * lock the WHY, not the widget: the listing loaders turn a 1-based `?page=N`
 * into a zero-based API `offset`, page 1 serialises to a CLEAN URL (the param
 * drops), invalid/`<1` input coerces to page 1 (listing URLs are public input,
 * never throw), and the pagination nav only shows once there is a second page.
 */
import { describe, expect, it } from 'vitest';

import {
  cursorPageHref,
  listingPageHref,
  pageSearchValue,
  pageToOffset,
  parsePageParam,
  shouldRenderPagination,
  totalPages,
} from './pagination';

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
    expect(cursorPageHref('/talent?page=3', 'next')).toBe('/talent?cursor=next');
  });

  it('preserves active filters while replacing transient selection state', () => {
    expect(
      cursorPageHref('/talent?q=react&selectedTalent=old&cursor=a', 'b', [
        'selectedTalent',
      ]),
    ).toBe('/talent?q=react&cursor=b');
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
