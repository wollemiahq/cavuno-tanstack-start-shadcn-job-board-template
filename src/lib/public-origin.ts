/**
 * The origin this board PUBLISHES itself at (ADR-0098).
 *
 * Every absolute self-URL a crawler reads — `<link rel="canonical">`,
 * `og:url`, sitemap `<loc>`, RSS `<link>` / `atom:link rel="self"` — must
 * name one address, and that address is the board's own canonical base, not
 * whichever host served the byte. A board with an active custom domain is
 * still reachable on `slug.cavuno.app`; a request-derived canonical there
 * advertises the wrong home and splits the board across two indexable
 * origins. The hosted board has always used the published base; this makes
 * the starter match it.
 *
 * The base comes from `board.seo().canonicalBase` (`GET /v1/boards/:id/seo`),
 * memoized per isolate on the same 30s TTL as the board context so folding it
 * into every page fn costs at most one upstream round trip per isolate per
 * window — NOT one extra call per render.
 *
 * Fallback is the request origin: an unpublished board (local API, no
 * registered public origin) 503s `seo()` or returns an empty base, and a
 * page must still emit a working self-canonical rather than none.
 *
 * NOT for links back to the current host — redirects, OAuth callbacks, and
 * the preview email retarget in `src/server/preview.ts` are genuinely about
 * the request. Those keep `requestOrigin()`.
 */
import { getBoard } from './board';
import { getDataSource } from './data-source.server';
import { createPublicOriginReader } from './public-origin-core';
import { requestOrigin } from './request-origin';

import type { DataSource } from './data-source';

/** Matches CONTEXT_TTL_MS — the two reads travel together on every page. */
const PUBLIC_ORIGIN_TTL_MS = 30_000;

const reader = createPublicOriginReader(
  {
    getBoardSeo: () => getBoard().seo(),
    getRequestOrigin: () => requestOrigin(),
    getDataSource,
    now: Date.now,
  },
  PUBLIC_ORIGIN_TTL_MS,
);

export const readPublicOrigin = reader.readPublicOrigin;

/** Test seam: drop the memo for one data source, or all of them. */
export function resetPublicOriginCache(source?: DataSource): void {
  reader.resetPublicOriginCache(source);
}
