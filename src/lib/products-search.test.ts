import { describe, expect, it } from 'vitest';

import { productsSearchResetsScroll } from './products-search';

describe('productsSearchResetsScroll', () => {
  it('scrolls back to the top for a new page', () => {
    expect(productsSearchResetsScroll({ kind: 'page', cursor: 'next' })).toBe(
      true,
    );
  });

  it('keeps the scroll position for a filter, search or sort change', () => {
    expect(
      productsSearchResetsScroll({ kind: 'filter', filters: { q: 'kit' } }),
    ).toBe(false);
  });
});
