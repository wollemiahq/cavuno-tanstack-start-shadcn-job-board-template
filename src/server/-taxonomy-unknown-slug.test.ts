import { describe, expect, it } from 'vitest';

/**
 * Unknown taxonomy slugs must resolve to a 404 page, never a 500.
 *
 * The listing endpoints 404 (companies markets: 400) on a slug that does not
 * exist. Once the taxonomy resolve was folded INTO the same `Promise.all` as
 * the listing — to kill a serial round trip — an unrecognised slug rejected
 * the whole batch before the resolve's verdict could be read, and five
 * routes started serving 500 where they had served 404. That is invisible to
 * a user (generic error page instead of the not-found page) and expensive
 * with crawlers, which keep dead taxonomy URLs in the index and burn crawl
 * budget on them.
 *
 * These pin the shape that prevents it: the listing's outcome is CAPTURED,
 * and the resolve decides. A genuine backend failure on a slug that really
 * exists must still surface as an error, so the captured error is re-thrown.
 */

/** The captured-outcome helper, mirrored from the page functions. */
type Settled<T> = { ok: true; value: T } | { ok: false; error: unknown };

async function settled<T>(promise: Promise<T>): Promise<Settled<T>> {
  try {
    return { ok: true, value: await promise };
  } catch (error) {
    return { ok: false, error };
  }
}

/** The verdict order every folded page function follows. */
function decide(
  resolved: { redirectTo?: string | null } | null,
  listResult: Settled<{ count: number }>,
) {
  if (!resolved) return { kind: 'not_found' as const };
  if (resolved.redirectTo) {
    return { kind: 'redirect' as const, to: resolved.redirectTo };
  }
  if (!listResult.ok) throw listResult.error;
  return { kind: 'ok' as const, list: listResult.value };
}

describe('unknown taxonomy slug never becomes a 500', () => {
  it('an unknown slug is not_found even though the listing rejected', async () => {
    // Both members fail: the resolve 404s (-> null) and so does the listing.
    const listResult = await settled(
      Promise.reject(new Error('404 categories_not_found')),
    );
    expect(listResult.ok).toBe(false);
    expect(decide(null, listResult)).toEqual({ kind: 'not_found' });
  });

  it('an alias still 308s even though the listing rejected on the alias', async () => {
    // A board WITH alias slugs: the listing may reject on the non-canonical
    // slug. The redirect verdict is read before the listing outcome, so the
    // 308 survives.
    const listResult = await settled(
      Promise.reject(new Error('404 categories_not_found')),
    );
    expect(decide({ redirectTo: 'engineering' }, listResult)).toEqual({
      kind: 'redirect',
      to: 'engineering',
    });
  });

  it('re-throws a real listing failure on a slug that exists', async () => {
    // The guard must not swallow genuine backend errors into a 404 page.
    const boom = new Error('500 upstream exploded');
    const listResult = await settled(Promise.reject(boom));
    expect(() => decide({ redirectTo: null }, listResult)).toThrow(boom);
  });

  it('returns the listing when everything resolves', async () => {
    const listResult = await settled(Promise.resolve({ count: 7 }));
    expect(decide({ redirectTo: null }, listResult)).toEqual({
      kind: 'ok',
      list: { count: 7 },
    });
  });
});

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
