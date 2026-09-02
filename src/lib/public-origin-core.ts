import type { DataSource } from './data-source';

interface CacheEntry {
  at: number;
  promise: Promise<string | null>;
}

export interface PublicOriginDependencies {
  /** `board.seo()` — publishes the origin the board advertises to crawlers. */
  getBoardSeo: () => Promise<{ canonicalBase?: string | null }>;
  /** The origin this request actually arrived on — the fallback. */
  getRequestOrigin: () => string;
  getDataSource: () => DataSource;
  now: () => number;
}

/**
 * Origin-only, trailing-slash-free normalization of a published base.
 *
 * The API may publish `https://careers.acme.com/`, a bare host, or an empty
 * string (unpublished board / local API). Anything that is not an absolute
 * http(s) URL is rejected so the caller falls back to the request origin
 * rather than emitting a canonical pointing at a relative or `javascript:`
 * base.
 */
export function normalizeOrigin(
  base: string | null | undefined,
): string | null {
  const trimmed = base?.trim();
  if (!trimmed) return null;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  return url.origin;
}

/**
 * Per-isolate memo for the board's published canonical origin, keyed by data
 * source exactly like `board-context-cache-core`: one document folds
 * `seoBase()` into many page reads, and the preview/demo cookie can point
 * requests at a DIFFERENT board in the same process.
 *
 * A rejected read is never retained — the entry is dropped so the next
 * request retries instead of pinning the request-origin fallback for the
 * whole TTL window.
 */
export function createPublicOriginReader(
  dependencies: PublicOriginDependencies,
  ttlMs: number,
) {
  const cache = new Map<DataSource, CacheEntry>();

  function readCanonicalOrigin(): Promise<string | null> {
    const source = dependencies.getDataSource();
    const now = dependencies.now();
    const hit = cache.get(source);
    if (hit && now - hit.at < ttlMs) return hit.promise;

    const promise = dependencies
      .getBoardSeo()
      .then((seo) => normalizeOrigin(seo?.canonicalBase))
      .catch(() => null)
      .then((origin) => {
        // Neither a failed read nor an unusable base is worth holding: both
        // mean the next request should ask again.
        if (origin === null && cache.get(source)?.promise === promise) {
          cache.delete(source);
        }
        return origin;
      });
    cache.set(source, { at: now, promise });
    return promise;
  }

  /**
   * The origin every canonical, `og:url`, sitemap `<loc>` and feed link must
   * use. This is the board's own published base when it has one (so a board
   * served on `slug.cavuno.app` while a custom domain is active advertises
   * the custom domain, matching the hosted board), and the request origin
   * otherwise.
   */
  async function readPublicOrigin(): Promise<string> {
    return (await readCanonicalOrigin()) ?? dependencies.getRequestOrigin();
  }

  function resetPublicOriginCache(source?: DataSource): void {
    if (source) cache.delete(source);
    else cache.clear();
  }

  return { readPublicOrigin, resetPublicOriginCache };
}
