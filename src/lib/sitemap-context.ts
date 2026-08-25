import {
  SITEMAP_CHUNK_SIZE,
  bucketFilename,
  buildBucketUrls,
  chunk,
  listedBuckets,
  type SitemapBucket,
} from '@cavuno/board/sitemap';

import type { BoardSdk } from '@cavuno/board';

/**
 * One complete sitemap build, shared by the index and every numbered bucket.
 * This mirrors the hosted-board context shape so a crawl never discovers
 * chunks from a different catalog snapshot than the index that linked them.
 */
export interface SitemapContext {
  readonly buckets: readonly SitemapBucketContext[];
}

export interface SitemapBucketContext {
  readonly bucket: SitemapBucket;
  readonly urls: readonly string[];
  readonly chunks: readonly (readonly string[])[];
}

type SitemapSource = {
  listedBuckets: typeof listedBuckets;
  buildBucketUrls: typeof buildBucketUrls;
};

const DEFAULT_SOURCE: SitemapSource = { listedBuckets, buildBucketUrls };

// Hosted boards keep their complete context longer than the individual route
// responses. This template mirrors that ratio: each XML response is cached for
// five minutes while the shared catalog snapshot lives for one hour.
export const SITEMAP_RESPONSE_CACHE_CONTROL = 'public, max-age=300';
export const SITEMAP_CONTEXT_TTL_MS = 60 * 60 * 1_000;
const SITEMAP_CONTEXT_CACHE_VERSION = 'v1';

type CachedContext = {
  expiresAt: number;
  value: Promise<SitemapContext>;
};

let contextCache = new WeakMap<BoardSdk, Map<string, CachedContext>>();
let edgeCacheRefused = false;

declare global {
  interface CacheStorage {
    /** Cloudflare Workers' named default edge cache. */
    readonly default?: Cache;
  }
}

function defaultEdgeCache(): Cache | undefined {
  if (edgeCacheRefused) return undefined;
  try {
    return globalThis.caches?.default;
  } catch {
    // Workers for Platforms can expose `caches` but refuse `.default`.
    // Retain the per-isolate promise cache there instead of failing sitemap XML.
    edgeCacheRefused = true;
    return undefined;
  }
}

function persistentCacheRequest(origin: string): Request {
  return new Request(
    `${origin}/__cavuno_internal/sitemap-context-${SITEMAP_CONTEXT_CACHE_VERSION}.json`,
  );
}

async function readPersistentContext(
  origin: string,
): Promise<{ context: SitemapContext; expiresAt: number } | null> {
  try {
    const response = await defaultEdgeCache()?.match(
      persistentCacheRequest(origin),
    );
    if (!response) return null;
    // SAFETY: The persistent entry is written only by writePersistentContext
    // below; the following bounds checks reject malformed or expired values.
    const payload = (await response.json()) as {
      context?: SitemapContext;
      expiresAt?: number;
    };
    const expiresAt = Number(payload.expiresAt);
    if (
      !payload.context ||
      !Array.isArray(payload.context.buckets) ||
      !Number.isFinite(expiresAt) ||
      expiresAt <= Date.now()
    ) {
      return null;
    }
    return { context: payload.context, expiresAt };
  } catch {
    edgeCacheRefused = true;
    return null;
  }
}

async function writePersistentContext(
  origin: string,
  context: SitemapContext,
  expiresAt: number,
): Promise<void> {
  try {
    await defaultEdgeCache()?.put(
      persistentCacheRequest(origin),
      new Response(JSON.stringify({ context, expiresAt }), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': `public, max-age=${Math.floor(
            SITEMAP_CONTEXT_TTL_MS / 1_000,
          )}`,
        },
      }),
    );
  } catch {
    edgeCacheRefused = true;
  }
}

export async function buildSitemapContext(
  board: BoardSdk,
  origin: string,
  source: SitemapSource = DEFAULT_SOURCE,
): Promise<SitemapContext> {
  const buckets = await source.listedBuckets(board);
  const built = await Promise.all(
    buckets.map(async (bucket): Promise<SitemapBucketContext> => {
      const urls = await source.buildBucketUrls(board, origin, bucket);
      const chunks = chunk(urls, SITEMAP_CHUNK_SIZE);

      return {
        bucket,
        urls,
        // Preserve the SDK's empty-bucket contract: chunk zero remains a valid
        // empty urlset and is discoverable from the index.
        chunks: chunks.length > 0 ? chunks : [[]],
      };
    }),
  );

  return { buckets: built };
}

/**
 * Cross-request sitemap snapshot. Rejected builds are evicted immediately so
 * a transient API failure cannot poison the cache for the freshness window.
 */
export function loadSitemapContext(
  board: BoardSdk,
  origin: string,
  source: SitemapSource = DEFAULT_SOURCE,
): Promise<SitemapContext> {
  const now = Date.now();
  let byOrigin = contextCache.get(board);
  if (!byOrigin) {
    byOrigin = new Map();
    contextCache.set(board, byOrigin);
  }

  const cached = byOrigin.get(origin);
  if (cached && cached.expiresAt > now) return cached.value;

  const entry: CachedContext = {
    expiresAt: now + SITEMAP_CONTEXT_TTL_MS,
    value: Promise.resolve({ buckets: [] }),
  };
  const value = (async () => {
    const persisted = await readPersistentContext(origin);
    if (persisted) {
      entry.expiresAt = persisted.expiresAt;
      return persisted.context;
    }
    const context = await buildSitemapContext(board, origin, source);
    const expiresAt = Date.now() + SITEMAP_CONTEXT_TTL_MS;
    entry.expiresAt = expiresAt;
    await writePersistentContext(origin, context, expiresAt);
    return context;
  })().catch((error) => {
    if (byOrigin?.get(origin)?.value === value) byOrigin.delete(origin);
    throw error;
  });
  entry.value = value;
  byOrigin.set(origin, entry);
  return entry.value;
}

export function sitemapIndexLocations(
  origin: string,
  context: SitemapContext,
): string[] {
  return context.buckets.flatMap(({ bucket, chunks }) =>
    chunks.map(
      (_entries, chunkIndex) =>
        `${origin}/sitemap/${bucketFilename(bucket, chunkIndex)}`,
    ),
  );
}

export function findSitemapChunk(
  context: SitemapContext,
  bucket: SitemapBucket,
  chunkIndex: number,
): readonly string[] | undefined {
  return context.buckets
    .find((entry) => entry.bucket === bucket)
    ?.chunks.at(chunkIndex);
}

/** Test-only: isolate module-cache cases. */
export function resetSitemapContextCacheForTest(): void {
  contextCache = new WeakMap();
  edgeCacheRefused = false;
}
