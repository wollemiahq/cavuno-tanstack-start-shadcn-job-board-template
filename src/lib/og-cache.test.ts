import { describe, expect, it } from 'vitest';

import { ogPngResponse } from './og-cache';
import { EDGE_CACHE_CONTROL } from './public-html-cache';

const png = new Uint8Array([1, 2, 3]).buffer;

describe('ogPngResponse', () => {
  it('never pins the unversioned card immutable, and keeps no-transform', () => {
    const cacheControl = ogPngResponse(png).headers.get('Cache-Control');
    // The OG URL carries no content hash: a title, salary or logo edit
    // changes the bytes behind the same URL, so a year-long immutable pin
    // strands a stale card in every scraper's cache.
    expect(cacheControl).not.toContain('immutable');
    expect(cacheControl).toContain('max-age=86400');
    expect(cacheControl).toContain('stale-while-revalidate=604800');
    // Cloudflare Polish must not re-encode the PNG.
    expect(cacheControl).toContain('no-transform');
  });

  it('opts into the gateway edge cache with the shared contract', () => {
    const response = ogPngResponse(png);
    // Without this the gateway re-runs the font fetch + satori on every hit.
    expect(response.headers.get('Cloudflare-CDN-Cache-Control')).toBe(
      EDGE_CACHE_CONTROL,
    );
    expect(response.headers.get('Content-Type')).toBe('image/png');
  });
});
