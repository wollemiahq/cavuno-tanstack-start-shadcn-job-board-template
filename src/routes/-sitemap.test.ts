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
      lastModified: '2026-09-01T00:00:00.000Z',
      chunks: [
        [
          {
            url: 'https://jobs.example/',
            lastModified: '2026-08-30T12:00:00.000Z',
          },
        ],
      ],
    },
    {
      bucket: 'jobs-details',
      lastModified: '2026-09-02T00:00:00.000Z',
      chunks: [
        [
          {
            url: 'https://jobs.example/companies/acme/jobs/eng',
            lastModified: '2026-08-29T03:15:23.828Z',
          },
        ],
      ],
    },
  ],
};

const loadSitemapContext = vi.fn();
const dependencies = {
  getPrimaryBoard: () => {
    // SAFETY: Handler tests never call the SDK; loadSitemapContext is faked.
    return {} as BoardSdk;
  },
  // The board publishes this origin; the sitemap lists URLs on it.
  readPublicOrigin: async () => 'https://jobs.example',
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
    // `handlers` may also be a builder function, so narrow like -go.test.ts.
    const index = SitemapIndexRoute.options.server?.handlers;
    const file = SitemapFileRoute.options.server?.handlers;
    expect(index && 'GET' in index && index.GET).toEqual(expect.any(Function));
    expect(file && 'GET' in file && file.GET).toEqual(expect.any(Function));
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

  it('stamps <lastmod> on the index from the bucket and on the urlset from each entry', async () => {
    const index = await (await getIndex()).text();
    expect(index).toContain('<lastmod>2026-09-01T00:00:00.000Z</lastmod>');

    // Localized bucket → renderUrlsetWithAlternates; job bucket → renderUrlset.
    const marketing = await (
      await getFile({ params: { file: 'marketing.xml' } })
    ).text();
    expect(marketing).toContain('<lastmod>2026-08-30T12:00:00.000Z</lastmod>');
    const jobs = await (
      await getFile({ params: { file: 'jobs-details.xml' } })
    ).text();
    expect(jobs).toContain('<lastmod>2026-08-29T03:15:23.828Z</lastmod>');
  });

  it('omits the gateway edge cache header on a 404', async () => {
    const res = await getFile({ params: { file: 'not-a-bucket.xml' } });
    expect(res.status).toBe(404);
    expect(res.headers.get('Cloudflare-CDN-Cache-Control')).toBeNull();
  });
});
