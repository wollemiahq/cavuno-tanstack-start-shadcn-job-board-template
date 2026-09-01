/**
 * Mount contract for `/sitemap.xml` and `/sitemap/$file`. Pins the 200 XML
 * cache headers (browser + platform gateway edge) and that 404s stay uncached.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  SITEMAP_EDGE_CACHE_CONTROL,
  SITEMAP_RESPONSE_CACHE_CONTROL,
} from '../lib/sitemap-context';
import {
  createSitemapFileHandler,
  createSitemapIndexHandler,
} from './-sitemap-handler';
import { Route as SitemapFileRoute } from './sitemap.$file';
import { Route as SitemapIndexRoute } from './sitemap[.]xml';

import type { SitemapContext } from '../lib/sitemap-context';
import type { BoardSdk } from '@cavuno/board';

const SNAPSHOT: SitemapContext = {
  buckets: [
    {
      bucket: 'marketing',
      urls: ['https://jobs.example/'],
      chunks: [['https://jobs.example/']],
    },
  ],
};

const loadSitemapContext = vi.fn();
const dependencies = {
  getPrimaryBoard: () => {
    // SAFETY: Handler tests never call the SDK; loadSitemapContext is faked.
    return {} as BoardSdk;
  },
  getRequest: () => new Request('https://jobs.example/sitemap.xml'),
  loadSitemapContext,
};

const getIndex = createSitemapIndexHandler(dependencies);
const getFile = createSitemapFileHandler(dependencies);

beforeEach(() => {
  loadSitemapContext.mockReset();
  loadSitemapContext.mockResolvedValue(SNAPSHOT);
});

describe('sitemap XML cache headers', () => {
  it('mounts GET handlers on both sitemap routes', () => {
    expect(SitemapIndexRoute.options.server?.handlers?.GET).toEqual(
      expect.any(Function),
    );
    expect(SitemapFileRoute.options.server?.handlers?.GET).toEqual(
      expect.any(Function),
    );
  });

  it('sends browser and gateway edge cache headers on the index 200', async () => {
    const res = await getIndex();
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe(
      SITEMAP_RESPONSE_CACHE_CONTROL,
    );
    expect(res.headers.get('Cloudflare-CDN-Cache-Control')).toBe(
      SITEMAP_EDGE_CACHE_CONTROL,
    );
  });

  it('sends browser and gateway edge cache headers on a bucket 200', async () => {
    const res = await getFile({ params: { file: 'marketing.xml' } });
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe(
      SITEMAP_RESPONSE_CACHE_CONTROL,
    );
    expect(res.headers.get('Cloudflare-CDN-Cache-Control')).toBe(
      SITEMAP_EDGE_CACHE_CONTROL,
    );
  });

  it('omits the gateway edge cache header on a 404', async () => {
    const res = await getFile({ params: { file: 'not-a-bucket.xml' } });
    expect(res.status).toBe(404);
    expect(res.headers.get('Cloudflare-CDN-Cache-Control')).toBeNull();
  });
});
