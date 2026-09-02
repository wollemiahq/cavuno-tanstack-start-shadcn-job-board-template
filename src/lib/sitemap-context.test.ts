import {
  SITEMAP_CHUNK_SIZE,
  buildBucketUrls,
  listedBuckets,
  type SitemapBucket,
} from '@cavuno/board/sitemap';
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
// SAFETY: Source fakes own every BoardSdk interaction in these unit tests;
// the board value is used only as an opaque WeakMap identity.
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
      add: vi.fn(async () => {}),
      addAll: vi.fn(async () => {}),
      delete: vi.fn(async () => false),
      keys: vi.fn(async () => []),
      match: vi.fn(async (request: RequestInfo | URL) =>
        stored.get(new Request(request).url)?.clone(),
      ),
      matchAll: vi.fn(async () => []),
      put: vi.fn(async (request: RequestInfo | URL, response: Response) => {
        stored.set(new Request(request).url, response.clone());
      }),
    } satisfies Cache;
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
    // SAFETY: As above, the source fake owns all SDK calls and this distinct
    // value exists only to model a second isolate's client identity.
    const secondBoard = {} as BoardSdk;
    const second = await loadSitemapContext(secondBoard, ORIGIN, secondSource);

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

  it('enumerates each jobs.list offset once across the three catalog buckets', async () => {
    const PAGE = 100;
    const TOTAL = 250;
    const jobs = Array.from({ length: TOTAL }, (_, index) => ({
      slug: `job-${index}`,
      company: { slug: 'acme' },
      categories: [{ slug: 'engineering' }],
      skills: [{ slug: 'typescript' }],
    }));
    const jobsList = vi.fn(
      async (query?: { limit?: number; offset?: number }) => {
        const offset = query?.offset ?? 0;
        const limit = query?.limit ?? PAGE;
        return {
          data: jobs.slice(offset, offset + limit),
          count: TOTAL,
        };
      },
    );
    const emptyPage = { data: [], count: 0 };
    // SAFETY: Catalog-walker fake — only the members `buildBucketUrls` reads
    // are assigned onto the same empty-board stub the other cases use.
    const catalogBoard: BoardSdk = Object.assign({} as BoardSdk, {
      context: async () => ({
        language: 'en',
        features: {
          blog: false,
          impressum: false,
          talentDirectory: 'off',
          employers: false,
        },
      }),
      jobs: { list: jobsList },
      companies: {
        list: async () => emptyPage,
        markets: async () => emptyPage,
      },
      salaries: {
        companies: { list: async () => emptyPage },
        titles: { list: async () => emptyPage },
        skills: { list: async () => emptyPage },
        locations: { list: async () => emptyPage },
      },
    });

    const context = await buildSitemapContext(catalogBoard, ORIGIN, {
      listedBuckets,
      buildBucketUrls,
    });

    const offsets = jobsList.mock.calls.map(([query]) => query?.offset ?? 0);
    expect(jobsList).toHaveBeenCalledTimes(3);
    expect([...offsets].sort((a, b) => a - b)).toEqual([0, PAGE, PAGE * 2]);

    const details = context.buckets.find(
      (entry) => entry.bucket === 'jobs-details',
    );
    const categories = context.buckets.find(
      (entry) => entry.bucket === 'jobs-categories',
    );
    const skills = context.buckets.find(
      (entry) => entry.bucket === 'jobs-skills',
    );
    expect(details?.urls).toHaveLength(TOTAL);
    expect(details?.urls).toContain(`${ORIGIN}/companies/acme/jobs/job-0`);
    expect(details?.urls).toContain(
      `${ORIGIN}/companies/acme/jobs/job-${TOTAL - 1}`,
    );
    expect(categories?.urls).toEqual([`${ORIGIN}/jobs/engineering`]);
    expect(skills?.urls).toEqual([`${ORIGIN}/jobs/skills/typescript`]);
  });
});
