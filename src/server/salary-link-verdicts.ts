/**
 * Whether a jobs or salary page may link a related page, read once per slug
 * and kept settled per isolate (see `settled-cache.ts`: each request awaits
 * its own read before storing it), so a page never makes a per-row call.
 *
 * - A role's salary page is linked only when its own read says `indexable`.
 * - A role's jobs page is linked only when its category resolves (some
 *   salary titles have no jobs category, and `/jobs/{slug}` 404s).
 *
 * A not-found answer is cached like any other. A failed read gets no link
 * and is remembered for a short while, so an outage costs one read per slug
 * every few seconds instead of one per page.
 */
import { isNotFound } from '@cavuno/board';

import { getBoard } from '../lib/board';
import { createSettledCache } from '../lib/settled-cache';
import { getLocale } from '../paraglide/runtime';
import { listingCacheKey } from './listing-place-cache';

const verdictCache = createSettledCache<string, string | null>({
  ttlMs: 5 * 60_000,
  maxEntries: 2_000,
});
const failedCache = createSettledCache<string, true>({
  ttlMs: 30_000,
  maxEntries: 2_000,
});

/**
 * The cached answer for `key`, or `read`'s. `read` resolves the slug to
 * link (or `null`); a not-found error means `null`, any other error means
 * no link for now.
 */
async function cachedVerdict(
  key: string,
  read: () => Promise<string | null>,
): Promise<string | null> {
  const cached = verdictCache.get(key);
  if (cached !== undefined) return cached;
  if (failedCache.get(key)) return null;
  const readAt = Date.now();
  try {
    const value = await read();
    verdictCache.set(key, value, readAt);
    return value;
  } catch (error) {
    if (isNotFound(error)) {
      verdictCache.set(key, null, readAt);
      return null;
    }
    failedCache.set(key, true, readAt);
    console.warn(
      JSON.stringify({
        message: 'cross-link verdict read failed',
        key: key.split('\u0000').slice(1).join(':'),
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    return null;
  }
}

/**
 * The slug of the role's `/salaries/titles/{slug}` page when that page is
 * indexable, else `null`.
 */
export function indexableSalaryTitleSlug(
  slug: string,
  headers: Record<string, string>,
): Promise<string | null> {
  const locale = getLocale();
  return cachedVerdict(
    listingCacheKey('salary-title', locale, slug),
    async () => {
      const title = await getBoard().salaries.titles.retrieve(
        slug,
        { locale },
        { headers },
      );
      return title.indexable ? title.canonicalSlug : null;
    },
  );
}

/**
 * The canonical slug of the role's `/jobs/{slug}` category page, or `null`
 * when the category does not exist.
 */
export function jobsCategorySlug(
  slug: string,
  headers: Record<string, string>,
): Promise<string | null> {
  return cachedVerdict(
    listingCacheKey('jobs-category', getLocale(), slug),
    async () => {
      const category = await getBoard().taxonomy.categories.resolve(slug, {
        headers,
      });
      return category.redirectTo ?? category.canonicalSlug;
    },
  );
}
