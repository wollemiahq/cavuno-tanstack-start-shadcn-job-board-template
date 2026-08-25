import { SITEMAP_CHUNK_SIZE, type SitemapBucket } from '@cavuno/board/sitemap';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildSitemapContext,
  findSitemapChunk,
  loadSitemapContext,
  resetSitemapContextCacheForTest,
  sitemapIndexLocations,
} from './sitemap-context';

import type { BoardSdk } from '@cavuno/board';

const ORIGIN = 'https://jobs.example';
const board = {} as BoardSdk;
const originalCaches = globalThis.caches;

beforeEach(() => {
  resetSitemapContextCacheForTest();
});

afterEach(() => {
  Object.defineProperty(globalThis, 'caches', {
    configurable: true,
    value: originalCaches,
  });
});

function source(options: {
  buckets?: SitemapBucket[];
  build?: (bucket: SitemapBucket) => Promise<string[]>;
}) {
  const buckets: SitemapBucket[] = options.buckets ?? ['marketing'];
  return {
    listedBuckets: vi.fn(async () => buckets),
    buildBucketUrls: vi.fn(
      async (_board: BoardSdk, _origin: string, bucket: SitemapBucket) =>
        options.build?.(bucket) ?? [`${ORIGIN}/${bucket}`],
    ),
  };
}

describe('hosted-shaped sitemap context', () => {
  it('publishes every hosted-sized chunk from the shared snapshot', async () => {
    const deps = source({
      buckets: ['marketing', 'jobs-details'],
      build: async (bucket) =>
        bucket === 'jobs-details'
          ? Array.from(
              { length: SITEMAP_CHUNK_SIZE * 2 + 1 },
              (_, index) => `${ORIGIN}/jobs/${index}`,
            )
          : [`${ORIGIN}/${bucket}`],
    });

    const context = await buildSitemapContext(board, ORIGIN, deps);

    expect(sitemapIndexLocations(ORIGIN, context)).toEqual([
      `${ORIGIN}/sitemap/marketing.xml`,
      `${ORIGIN}/sitemap/jobs-details.xml`,
      `${ORIGIN}/sitemap/jobs-details-2.xml`,
      `${ORIGIN}/sitemap/jobs-details-3.xml`,
    ]);
    expect(findSitemapChunk(context, 'jobs-details', 2)).toHaveLength(1);
  });

  it('retains an indexed chunk-zero urlset for an enabled empty bucket', async () => {
    const context = await buildSitemapContext(
      board,
      ORIGIN,
      source({ buckets: ['blog'], build: async () => [] }),
    );

    expect(sitemapIndexLocations(ORIGIN, context)).toEqual([
      `${ORIGIN}/sitemap/blog.xml`,
    ]);
    expect(findSitemapChunk(context, 'blog', 0)).toEqual([]);
  });

  it('reuses one complete build across index and bucket requests', async () => {
    const deps = source({ buckets: ['marketing', 'jobs-details'] });

    const [first, second] = await Promise.all([
      loadSitemapContext(board, ORIGIN, deps),
      loadSitemapContext(board, ORIGIN, deps),
    ]);

    expect(second).toBe(first);
    expect(deps.listedBuckets).toHaveBeenCalledOnce();
    expect(deps.buildBucketUrls).toHaveBeenCalledTimes(2);
  });

  it('reuses the persistent Worker snapshot across isolated board clients', async () => {
    const stored = new Map<string, Response>();
    const edgeCache = {
      match: vi.fn(async (request: Request) =>
        stored.get(request.url)?.clone(),
      ),
      put: vi.fn(async (request: Request, response: Response) => {
        stored.set(request.url, response.clone());
      }),
    } as unknown as Cache;
    Object.defineProperty(globalThis, 'caches', {
      configurable: true,
      value: { default: edgeCache },
    });

    const firstSource = source({ buckets: ['jobs-details'] });
    const first = await loadSitemapContext(board, ORIGIN, firstSource);

    // Simulate a new isolate/module cache while retaining Cloudflare's shared
    // Cache API entry, then use a distinct SDK client object.
    resetSitemapContextCacheForTest();
    const secondSource = source({ buckets: ['blog'] });
    const second = await loadSitemapContext(
      {} as BoardSdk,
      ORIGIN,
      secondSource,
    );

    expect(second).toEqual(first);
    expect(secondSource.listedBuckets).not.toHaveBeenCalled();
    expect(edgeCache.put).toHaveBeenCalledOnce();
    expect(edgeCache.match).toHaveBeenCalledTimes(2);
  });

  it('evicts a rejected build so the next request can retry', async () => {
    const deps = source({});
    deps.listedBuckets.mockRejectedValueOnce(new Error('temporary'));

    await expect(loadSitemapContext(board, ORIGIN, deps)).rejects.toThrow(
      'temporary',
    );
    await expect(
      loadSitemapContext(board, ORIGIN, deps),
    ).resolves.toBeDefined();
    expect(deps.listedBuckets).toHaveBeenCalledTimes(2);
  });
});
