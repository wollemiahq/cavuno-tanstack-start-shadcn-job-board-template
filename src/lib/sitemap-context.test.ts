import { BoardApiError } from '@cavuno/board';
import {
  SITEMAP_CHUNK_SIZE,
  buildBucketEntries,
  listedBucketEntries,
  type SitemapBucket,
} from '@cavuno/board/sitemap';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildSitemapContext,
  findSitemapChunk,
  loadSitemapContext,
  resetSitemapContextCacheForTest,
  sitemapIndexEntries,
} from './sitemap-context';

import type { BoardSdk } from '@cavuno/board';

const ORIGIN = 'https://jobs.example';

/**
 * `board.sitemap` fake for an API that predates the published-sitemap routes:
 * both calls 404 like the real client would, so the walker falls back to
 * catalog enumeration.
 */
function publishedSitemapUnavailable(): BoardSdk['sitemap'] {
  const notFound = () =>
    Promise.reject(
      new BoardApiError({
        status: 404,
        code: 'unknown_error',
        message: 'Not Found',
        raw: undefined,
      }),
    );
  // SAFETY: the walker only ever calls `board.sitemap()` and
  // `board.sitemap.entries()`; both reject with a 404 here, which is the
  // full behaviour of the real client against an API without these routes.
  return Object.assign(notFound, { entries: notFound }) as BoardSdk['sitemap'];
}

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
    listedBucketEntries: vi.fn(async () =>
      buckets.map((bucket) => ({ bucket })),
    ),
    buildBucketEntries: vi.fn(
      async (_board: BoardSdk, _origin: string, bucket: SitemapBucket) =>
        ((await options.build?.(bucket)) ?? [`${ORIGIN}/${bucket}`]).map(
          (url) => ({ url }),
        ),
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

    expect(
      sitemapIndexEntries(ORIGIN, context).map((entry) => entry.url),
    ).toEqual([
      `${ORIGIN}/sitemap/marketing.xml`,
      `${ORIGIN}/sitemap/jobs-details.xml`,
      `${ORIGIN}/sitemap/jobs-details-2.xml`,
      `${ORIGIN}/sitemap/jobs-details-3.xml`,
    ]);
    expect(findSitemapChunk(context, 'jobs-details', 2)).toHaveLength(1);
  });

  it('drops a stamp that is not a real date instead of persisting it', async () => {
    // A bad value would sit in the shared edge snapshot for an hour and
    // either crash the renderer or make crawlers reject the whole file.
    const context = await buildSitemapContext(board, ORIGIN, {
      listedBucketEntries: vi.fn(async () => [
        { bucket: 'marketing' as const, lastModified: 'unknown' },
      ]),
      buildBucketEntries: vi.fn(async () => [
        { url: `${ORIGIN}/`, lastModified: 'not a date' },
        {
          url: `${ORIGIN}/about`,
          lastModified: new Date('2026-09-01T00:00:00Z'),
        },
      ]),
    });

    const [bucket] = context.buckets;
    expect(bucket?.lastModified).toBeUndefined();
    expect(bucket?.chunks.flat()).toEqual([
      { url: `${ORIGIN}/` },
      { url: `${ORIGIN}/about`, lastModified: '2026-09-01T00:00:00.000Z' },
    ]);
  });

  it('retains an indexed chunk-zero urlset for an enabled empty bucket', async () => {
    const context = await buildSitemapContext(
      board,
      ORIGIN,
      source({ buckets: ['blog'], build: async () => [] }),
    );

    expect(
      sitemapIndexEntries(ORIGIN, context).map((entry) => entry.url),
    ).toEqual([`${ORIGIN}/sitemap/blog.xml`]);
    expect(findSitemapChunk(context, 'blog', 0)).toEqual([]);
  });

  it('reuses one complete build across index and bucket requests', async () => {
    const deps = source({ buckets: ['marketing', 'jobs-details'] });

    const [first, second] = await Promise.all([
      loadSitemapContext(board, ORIGIN, deps),
      loadSitemapContext(board, ORIGIN, deps),
    ]);

    expect(second).toBe(first);
    expect(deps.listedBucketEntries).toHaveBeenCalledOnce();
    expect(deps.buildBucketEntries).toHaveBeenCalledTimes(2);
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
    expect(secondSource.listedBucketEntries).not.toHaveBeenCalled();
    expect(edgeCache.put).toHaveBeenCalledOnce();
    expect(edgeCache.match).toHaveBeenCalledTimes(2);
  });

  it('evicts a rejected build so the next request can retry', async () => {
    const deps = source({});
    deps.listedBucketEntries.mockRejectedValueOnce(new Error('temporary'));

    await expect(loadSitemapContext(board, ORIGIN, deps)).rejects.toThrow(
      'temporary',
    );
    await expect(
      loadSitemapContext(board, ORIGIN, deps),
    ).resolves.toBeDefined();
    expect(deps.listedBucketEntries).toHaveBeenCalledTimes(2);
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
      // An API without the published-sitemap routes answers 404, which is
      // what sends the walker down this legacy catalog enumeration.
      sitemap: publishedSitemapUnavailable(),
    });

    const context = await buildSitemapContext(catalogBoard, ORIGIN, {
      listedBucketEntries,
      buildBucketEntries,
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
    expect(details?.chunks.flat().map((entry) => entry.url)).toHaveLength(
      TOTAL,
    );
    expect(details?.chunks.flat().map((entry) => entry.url)).toContain(
      `${ORIGIN}/companies/acme/jobs/job-0`,
    );
    expect(details?.chunks.flat().map((entry) => entry.url)).toContain(
      `${ORIGIN}/companies/acme/jobs/job-${TOTAL - 1}`,
    );
    expect(categories?.chunks.flat().map((entry) => entry.url)).toEqual([
      `${ORIGIN}/jobs/engineering`,
    ]);
    expect(skills?.chunks.flat().map((entry) => entry.url)).toEqual([
      `${ORIGIN}/jobs/skills/typescript`,
    ]);
  });
  it('mirrors the published sitemap when the API serves it, without enumerating the catalog', async () => {
    const jobsList = vi.fn(async () => ({ data: [], count: 0 }));
    const entries = vi.fn(
      async (bucket: string, query?: { cursor?: string | null }) => {
        if (bucket !== 'jobs-details')
          return { data: [], hasMore: false, nextCursor: null };
        return query?.cursor
          ? {
              data: [
                {
                  path: '/companies/acme/jobs/job-2',
                  lastModified: '2026-08-29T03:15:23.828Z',
                },
              ],
              hasMore: false,
              nextCursor: null,
            }
          : {
              data: [
                { path: '/companies/acme/jobs/job-1' },
                { path: '/jobs/locations/adelaide-sa-australia/skills/a320' },
              ],
              hasMore: true,
              nextCursor: 'offset:2',
            };
      },
    );
    // SAFETY: mirror-path fake — `sitemap` is the only member the walker
    // reads when the API publishes its sitemap; `jobs.list` proves it is
    // never consulted.
    const mirrorBoard: BoardSdk = Object.assign({} as BoardSdk, {
      jobs: { list: jobsList },
      sitemap: Object.assign(
        async () => ({
          object: 'board_sitemap',
          buckets: [
            {
              bucket: 'jobs-details',
              count: 3,
              lastModified: '2026-09-05T18:00:37.956Z',
            },
            { bucket: 'marketing', count: 0 },
          ],
        }),
        { entries },
      ),
    });

    const context = await buildSitemapContext(mirrorBoard, ORIGIN, {
      listedBucketEntries,
      buildBucketEntries,
    });

    expect(jobsList).not.toHaveBeenCalled();
    expect(context.buckets.map((entry) => entry.bucket)).toEqual([
      'marketing',
      'jobs-details',
    ]);
    const details = context.buckets.find(
      (entry) => entry.bucket === 'jobs-details',
    );
    expect(details?.chunks.flat().map((entry) => entry.url)).toEqual([
      `${ORIGIN}/companies/acme/jobs/job-1`,
      `${ORIGIN}/jobs/locations/adelaide-sa-australia/skills/a320`,
      `${ORIGIN}/companies/acme/jobs/job-2`,
    ]);
    // The wire stamp survives to the entry that `renderUrlset` reads.
    expect(details?.chunks.flat().at(-1)?.lastModified).toBe(
      '2026-08-29T03:15:23.828Z',
    );
    expect(details?.chunks.flat()[0]?.lastModified).toBeUndefined();
    // The bucket-level stamp reaches the index entry for its chunk file.
    expect(details?.lastModified).toBe('2026-09-05T18:00:37.956Z');
    expect(
      sitemapIndexEntries(ORIGIN, context).find((entry) =>
        entry.url.endsWith('/jobs-details.xml'),
      )?.lastModified,
    ).toBe('2026-09-05T18:00:37.956Z');
  });
});
