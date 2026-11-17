/**
 * Which salary pages a jobs or company page may link to, read from the salary
 * hub lists: each hub row carries the Board API's `indexable` verdict for the
 * page it links to. One list read per hub, kept settled per isolate (see
 * `settled-cache.ts`: each request awaits its own read before storing it), so
 * a page never makes a per-row salary call just to decide a link.
 *
 * A slug the list does not carry, or a failed read, gets no link: a page only
 * links salary pages the API says are indexable.
 */
import { getBoard } from '../lib/board';
import { createSettledCache } from '../lib/settled-cache';
import { getLocale } from '../paraglide/runtime';
import { listingCacheKey } from './listing-place-cache';

/** Indexable salary page slugs per hub, data source and locale. */
const indexableSlugsCache = createSettledCache<string, readonly string[]>({
  ttlMs: 5 * 60_000,
  maxEntries: 50,
});

async function readIndexableSlugs(
  key: string,
  read: () => Promise<readonly string[]>,
): Promise<ReadonlySet<string>> {
  const cached = indexableSlugsCache.get(key);
  if (cached) return new Set(cached);
  const readAt = Date.now();
  try {
    const slugs = await read();
    indexableSlugsCache.set(key, slugs, readAt);
    return new Set(slugs);
  } catch {
    return new Set();
  }
}

/** Title slugs whose `/salaries/titles/{slug}` page is indexable. */
export function indexableSalaryTitleSlugs(
  headers: Record<string, string>,
): Promise<ReadonlySet<string>> {
  const locale = getLocale();
  return readIndexableSlugs(
    listingCacheKey('salary-titles', locale),
    async () => {
      const list = await getBoard().salaries.titles.list(
        { locale },
        { headers },
      );
      return list.data.filter((t) => t.indexable).map((t) => t.slug);
    },
  );
}

/** Company slugs whose `/companies/{slug}/salaries` page is indexable. */
export function indexableCompanySalarySlugs(
  headers: Record<string, string>,
): Promise<ReadonlySet<string>> {
  return readIndexableSlugs(listingCacheKey('salary-companies'), async () => {
    const list = await getBoard().salaries.companies.list({ headers });
    return list.data.filter((c) => c.indexable).map((c) => c.companySlug);
  });
}
