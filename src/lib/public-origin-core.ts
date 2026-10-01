import { createSettledCache } from './settled-cache';

import type { DataSource } from './data-source';

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
 * Settled values only (see `settled-cache.ts`): each request awaits its own
 * read. Neither a failed read nor an unusable base is stored, so the next
 * request asks again instead of pinning the request-origin fallback for the
 * whole TTL window.
 */
export function createPublicOriginReader(
  dependencies: PublicOriginDependencies,
  ttlMs: number,
) {
  const cache = createSettledCache<DataSource, string>({
    ttlMs,
    now: dependencies.now,
  });

  async function readCanonicalOrigin(): Promise<string | null> {
    const source = dependencies.getDataSource();
    const hit = cache.get(source);
    if (hit !== undefined) return hit;

    const readAt = dependencies.now();
    let origin: string | null;
    try {
      origin = normalizeOrigin(
        (await dependencies.getBoardSeo())?.canonicalBase,
      );
    } catch {
      origin = null;
    }
    if (origin !== null) cache.set(source, origin, readAt);
    return origin;
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
