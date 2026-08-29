import { describe, expect, it } from 'vitest';

/**
 * Unknown taxonomy slugs must resolve to a 404 page, never a 500.
 *
 * The listing endpoints 404 (companies markets: 400) on a slug that does not
 * exist. Once the taxonomy resolve was folded INTO the same `Promise.all` as
 * the listing — to kill a serial round trip — an unrecognised slug rejected
 * the whole batch before the resolve's verdict could be read, and five
 * routes started serving 500 where they had served 404.
 *
 * The verdict (`not_found` / redirect / rethrow / ok) is inlined in the
 * page functions. Do not photocopy it into this file — a copy stays green
 * while production rots. The net is the source shape: every resolve batch
 * captures the listing outcome instead of destructuring a raw `list`.
 */

describe('the folded page functions all use the captured-outcome shape', () => {
  it('every resolve batch checks the verdict before unwrapping the listing', async () => {
    const sources = await Promise.all(
      ['../server/jobs-listing-pages.ts', '../server/companies-pages.ts'].map(
        async (path) => {
          const url = new URL(
            path.replace('../server/', './'),
            import.meta.url,
          );
          const { readFile } = await import('node:fs/promises');
          return readFile(url, 'utf8');
        },
      ),
    );
    for (const source of sources) {
      // No page function may destructure a raw `list`/`page` out of a batch
      // that also resolves a taxonomy slug — it must capture the outcome.
      const rawListInResolveBatch =
        /const \[\s*(?:category|skill|place|market)[^\]]*?,\s*(?:list|page),/s.test(
          source,
        );
      expect(rawListInResolveBatch).toBe(false);
    }
  });
});
