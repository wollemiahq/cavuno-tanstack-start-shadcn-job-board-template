import { EDGE_CACHE_CONTROL } from './public-html-cache';

/**
 * The OG URL is UNVERSIONED and its bytes change whenever the title, salary
 * or logo behind it changes, so the card must never be pinned immutable —
 * scrapers would hold a stale card for a year. A day fresh plus a week of
 * stale-while-revalidate keeps the render cheap without stranding an edit.
 * `no-transform` stays: Cloudflare Polish must not re-encode the PNG.
 */
export const OG_CACHE_CONTROL =
  'public, max-age=86400, stale-while-revalidate=604800, no-transform';

/**
 * The finished share-card response.
 *
 * Split from `og-render.ts` so the cache contract is unit-testable: that
 * module statically imports `workers-og`, whose yoga WASM cannot be loaded
 * outside the Worker runtime.
 */
export function ogPngResponse(png: ArrayBuffer): Response {
  return new Response(png, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': OG_CACHE_CONTROL,
      // The gateway edge-cache opt-in. Without it every hit re-runs the
      // whole render (Google Fonts subset fetch + satori + resvg).
      'Cloudflare-CDN-Cache-Control': EDGE_CACHE_CONTROL,
    },
  });
}
