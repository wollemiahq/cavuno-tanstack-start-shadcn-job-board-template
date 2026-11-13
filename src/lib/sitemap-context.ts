import {
  BOARD_PATHS,
  companyPath,
  talentLocationPath,
} from '@cavuno/board/paths';
import {
  MIN_JOBS_PER_INDEXED_PAGE,
  SITEMAP_CHUNK_SIZE,
  bucketFilename,
  buildBucketEntries,
  chunk,
  listedBucketEntries,
  type SitemapBucket,
  type SitemapIndexEntry,
  type SitemapUrlEntry,
} from '@cavuno/board/sitemap';

import { COMPANY_JOBS_PREVIEW_COUNT } from '../board/company-jobs-preview';
import { placeLinkSlug } from '../board/place-link';
import { TALENT_PLACES_LIMIT } from '../board/talent-places';
import { impressumHasContent } from '../content/legal/impressum-availability';
import {
  hasEmployerOfferPage,
  hasPaidCandidatePlans,
} from './candidate-pricing';
import { boardGlobalReadCache } from './read-cache';
import { createSettledCache } from './settled-cache';

import type { SettledCache } from './settled-cache';
import type { BoardSdk } from '@cavuno/board';

/**
 * One complete sitemap build, shared by the index and every numbered bucket.
 * This mirrors the hosted-board context shape so a crawl never discovers
 * chunks from a different catalog snapshot than the index that linked them.
 */
export interface SitemapContext {
  readonly buckets: readonly SitemapBucketContext[];
}

/**
 * One sitemap URL as persisted in the shared snapshot. Strings only, so the
 * JSON round trip through the edge cache is lossless.
 */
export interface SitemapEntry {
  readonly url: string;
  /** ISO 8601, from the board's published sitemap; absent → no `<lastmod>`. */
  readonly lastModified?: string;
}

export interface SitemapBucketContext {
  readonly bucket: SitemapBucket;
  /** Newest content in the bucket, from the board's published sitemap index. */
  readonly lastModified?: string;
  readonly chunks: readonly (readonly SitemapEntry[])[];
}

type SitemapSource = {
  listedBucketEntries: typeof listedBucketEntries;
  buildBucketEntries: typeof buildBucketEntries;
};

const DEFAULT_SOURCE: SitemapSource = {
  listedBucketEntries,
  buildBucketEntries,
};

// Hosted boards keep their complete context longer than the individual route
// responses. This template mirrors that ratio: each XML response is cached for
// five minutes while the shared catalog snapshot lives for one hour.
export const SITEMAP_RESPONSE_CACHE_CONTROL = 'public, max-age=300';
// The platform gateway only edge-caches a 200 GET when this header is present.
// It caps fresh at 300s, then serves stale while refreshing in the background
// for up to 24h. Browser Cache-Control alone is a cold miss after 5 minutes.
export const SITEMAP_EDGE_CACHE_CONTROL = 'public, max-age=300';
export const SITEMAP_CONTEXT_TTL_MS = 60 * 60 * 1_000;
// v2: entries carry `lastModified`; a v1 snapshot holds bare strings.
const SITEMAP_CONTEXT_CACHE_VERSION = 'v2';

// The origin key falls back to the request origin, so bound it per client.
const SITEMAP_CONTEXT_MAX_ORIGINS = 8;

let contextCache = new WeakMap<
  BoardSdk,
  SettledCache<string, SitemapContext>
>();
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
    // Rely on the per-isolate snapshot there instead of failing sitemap XML.
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
          'Cache-Control': `public, max-age=${Math.floor(SITEMAP_CONTEXT_TTL_MS / 1_000)}`,
        },
      }),
    );
  } catch {
    edgeCacheRefused = true;
  }
}

/**
 * Per-build view of the SDK. `jobs-categories`, `jobs-skills`, and
 * `jobs-details` each walk the full job catalog with the same
 * `jobs.list({ limit, offset })` pages, so identical queries within one build
 * share one in-flight promise. The cache is local to the returned view —
 * never module scoped, never reused across builds. The SDK client is a plain
 * object whose namespace methods close over the client (no `this`).
 */
function memoizingBoardView(board: BoardSdk): BoardSdk {
  // Test doubles stub only the namespaces a case touches.
  if (!board.jobs) return board;
  const inflight = new Map<string, ReturnType<BoardSdk['jobs']['list']>>();
  const list = board.jobs.list.bind(board.jobs);
  return {
    ...board,
    jobs: {
      ...board.jobs,
      list: (query, ...rest) => {
        const key = JSON.stringify(query ?? null);
        const cached = inflight.get(key);
        if (cached) return cached;
        const pending = list(query, ...rest);
        inflight.set(key, pending);
        return pending;
      },
    },
  };
}

/** 200 XML body with browser Cache-Control and the gateway edge-cache opt-in. */
export function sitemapXmlResponse(xml: string): Response {
  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': SITEMAP_RESPONSE_CACHE_CONTROL,
      'Cloudflare-CDN-Cache-Control': SITEMAP_EDGE_CACHE_CONTROL,
    },
  });
}

/**
 * Normalise the wire stamp once, here, because this is what gets persisted to
 * the shared edge snapshot for an hour: a value that is not a real date is
 * dropped rather than emitted as an invalid `<lastmod>` (which makes crawlers
 * reject the whole file) or crashing every isolate that reads the snapshot.
 */
function isoTimestamp(value: Date | string | undefined): string | undefined {
  if (value === undefined || value === '') return undefined;
  const time = value instanceof Date ? value : new Date(value);
  return Number.isFinite(time.getTime()) ? time.toISOString() : undefined;
}

function toSitemapEntry(entry: SitemapUrlEntry): SitemapEntry {
  const lastModified = isoTimestamp(entry.lastModified);
  return lastModified ? { url: entry.url, lastModified } : { url: entry.url };
}

/**
 * Plan pages this starter owns. `/employers` always renders, but it is
 * listed only when it has an offer, the rule under which the footer links
 * it (otherwise it is an empty state). `/job-seekers` redirects to `/jobs` unless
 * the board sells a paid candidate plan, so it is listed only under the
 * same predicate its route loader uses. `/pricing` always renders, but it
 * compares candidate and employer plans: without paid candidate plans it
 * repeats `/employers` (which the footer links), so it is listed only with
 * them, the rule under which both plan pages link it.
 */
const PLAN_PAGES = [
  { path: '/employers', isLive: hasEmployerOfferPage },
  { path: '/job-seekers', isLive: hasPaidCandidatePlans },
  { path: '/pricing', isLive: hasPaidCandidatePlans },
] as const;

/**
 * The plan pages that serve a page rather than a redirect. Reads the same
 * board-global, edge-cached plan lists the root loader's nav gate reads, once
 * per snapshot build (not per sitemap request). A failed read is treated as
 * an empty catalogue, as the nav gate does: it must not take down the
 * sitemap's other buckets.
 */
async function livePlanPagePaths(board: BoardSdk): Promise<string[]> {
  // Test doubles stub only the namespaces a case touches.
  const read = (params: { purpose?: 'employer_service' }) =>
    board.plans
      ? board.plans
          .list(params, boardGlobalReadCache())
          .then((page) => page.data)
          .catch(() => [])
      : Promise.resolve([]);
  const [plans, employerServicePlans] = await Promise.all([
    read({}),
    read({ purpose: 'employer_service' }),
  ]);
  return PLAN_PAGES.filter((page) =>
    page.isLive(plans, employerServicePlans),
  ).map((page) => page.path);
}

/** Companies per catalog page, the list endpoint's maximum. */
const COMPANY_PAGE_SIZE = 100;
/** Bounds the catalog walk: the companies ranked first hold the most jobs. */
const COMPANY_JOBS_MAX_PAGES = 10;

/**
 * The `/companies/{slug}/jobs` pages to list: the starter's own route (the
 * platform's published sitemap has no such page), for each company with
 * more jobs than its profile previews. With fewer, the jobs page repeats the
 * profile's list. The catalog's browse order is ranked by job count, so the
 * walk stops at the first page with no company over the preview, once per
 * snapshot build. The ranking can lag the live count it returns, so a single
 * company at or under the preview does not end it. A failed read lists none
 * of them.
 */
async function companyJobsPaths(board: BoardSdk): Promise<string[]> {
  // Test doubles stub only the namespaces a case touches.
  if (!board.companies) return [];
  const paths = new Set<string>();
  for (let pageIndex = 0; pageIndex < COMPANY_JOBS_MAX_PAGES; pageIndex++) {
    const page = await board.companies.list(
      { limit: COMPANY_PAGE_SIZE, offset: pageIndex * COMPANY_PAGE_SIZE },
      boardGlobalReadCache(),
    );
    const busy = page.data.filter(
      (company) =>
        (company.publishedJobCount ?? 0) > COMPANY_JOBS_PREVIEW_COUNT,
    );
    for (const company of busy) paths.add(`${companyPath(company.slug)}/jobs`);
    if (busy.length === 0 || page.data.length < COMPANY_PAGE_SIZE) break;
  }
  return [...paths];
}

/**
 * The talent location pages to list, when the talent directory is public:
 * the `/talent/locations` directory and each place page with at least
 * `MIN_JOBS_PER_INDEXED_PAGE` candidates (the SDK's thin-content floor,
 * which the jobs location pages use too), counted as an anonymous visitor
 * sees them. Linked by the board-language slug the pages are canonical at.
 * Starter-side until the platform's published sitemap lists them; they ride
 * the `marketing` bucket beside `/talent`.
 */
async function talentLocationPaths(board: BoardSdk): Promise<string[]> {
  // Test doubles stub only the namespaces a case touches.
  if (!board.talent?.places || !board.context) return [];
  const { features } = await board.context();
  if (features.talentDirectory !== 'public') return [];
  const { data } = await board.talent.places.list({
    limit: TALENT_PLACES_LIMIT,
  });
  return [
    BOARD_PATHS.talentLocations,
    ...data.flatMap((place) => {
      const slug = placeLinkSlug(place);
      return slug && place.candidateCount >= MIN_JOBS_PER_INDEXED_PAGE
        ? [talentLocationPath(slug)]
        : [];
    }),
  ];
}

function withLocalMarketingPages(
  origin: string,
  bucket: SitemapBucket,
  entries: SitemapEntry[],
  planPaths: readonly string[],
  talentPaths: readonly string[],
): SitemapEntry[] {
  if (bucket !== 'marketing') return entries;
  // `/impressum` is listed exactly when the operator has written one
  // (`impressumHasContent`), and each plan page exactly when `PLAN_PAGES`
  // says it is live. Whatever the SDK or the published sitemap says about
  // those pages is dropped when they are not live.
  const impressumPaths = impressumHasContent() ? [BOARD_PATHS.impressum] : [];
  const ownedPaths = [
    BOARD_PATHS.impressum,
    ...PLAN_PAGES.map((page) => page.path),
  ];
  const livePaths = new Set<string>([...impressumPaths, ...planPaths]);
  const notLive = new Set(
    ownedPaths
      .filter((path) => !livePaths.has(path))
      .map((path) => `${origin}${path}`),
  );
  const listed = entries.filter((entry) => !notLive.has(entry.url));
  const urls = new Set(listed.map((entry) => entry.url));
  return [
    ...listed,
    ...[...planPaths, ...impressumPaths, ...talentPaths].flatMap((path) => {
      const url = `${origin}${path}`;
      if (urls.has(url)) return [];
      urls.add(url);
      return [{ url }];
    }),
  ];
}

/** Appends the starter's company jobs pages to the companies bucket. */
function withLocalCompanyJobsPages(
  origin: string,
  bucket: SitemapBucket,
  entries: SitemapEntry[],
  paths: readonly string[],
): SitemapEntry[] {
  if (bucket !== 'companies' || paths.length === 0) return entries;
  const urls = new Set(entries.map((entry) => entry.url));
  const added = paths
    .map((path) => `${origin}${path}`)
    .filter((url) => !urls.has(url))
    .map((url) => ({ url }));
  return [...entries, ...added];
}

export async function buildSitemapContext(
  board: BoardSdk,
  origin: string,
  source: SitemapSource = DEFAULT_SOURCE,
): Promise<SitemapContext> {
  const catalog = memoizingBoardView(board);
  const [listed, planPaths, talentPaths, companyJobPaths] = await Promise.all([
    source.listedBucketEntries(catalog),
    livePlanPagePaths(board),
    // A failed talent or company read leaves those pages out; it must not
    // take down the sitemap's other buckets, which never depended on it.
    talentLocationPaths(board).catch((): string[] => []),
    companyJobsPaths(board).catch((): string[] => []),
  ]);
  const built = await Promise.all(
    listed.map(
      async ({ bucket, lastModified }): Promise<SitemapBucketContext> => {
        const sdkEntries = await source.buildBucketEntries(
          catalog,
          origin,
          bucket,
        );
        const entries = withLocalCompanyJobsPages(
          origin,
          bucket,
          withLocalMarketingPages(
            origin,
            bucket,
            sdkEntries.map(toSitemapEntry),
            planPaths,
            talentPaths,
          ),
          companyJobPaths,
        );
        const chunks = chunk(entries, SITEMAP_CHUNK_SIZE);
        const built: SitemapBucketContext = {
          bucket,
          chunks: chunks.length > 0 ? chunks : [[]],
        };
        const stamp = isoTimestamp(lastModified);
        return stamp ? { ...built, lastModified: stamp } : built;
      },
    ),
  );

  return { buckets: built };
}

function snapshotsFor(board: BoardSdk): SettledCache<string, SitemapContext> {
  let snapshots = contextCache.get(board);
  if (!snapshots) {
    snapshots = createSettledCache({
      ttlMs: SITEMAP_CONTEXT_TTL_MS,
      maxEntries: SITEMAP_CONTEXT_MAX_ORIGINS,
    });
    contextCache.set(board, snapshots);
  }
  return snapshots;
}

/**
 * Cross-request sitemap snapshot, settled values only (see
 * `settled-cache.ts`). Each request reads or builds the snapshot itself and
 * stores it only once its own build succeeds, so a cancelled crawler request
 * can never leave a pending build for the index and bucket requests behind
 * it to wait on. A failed build is not stored; the next request retries.
 * Concurrent cold requests each build; the gateway edge-caches sitemap
 * responses in front of the tenant, so that overlap is rare.
 */
export async function loadSitemapContext(
  board: BoardSdk,
  origin: string,
  source: SitemapSource = DEFAULT_SOURCE,
): Promise<SitemapContext> {
  const snapshots = snapshotsFor(board);
  const cached = snapshots.get(origin);
  if (cached) return cached;

  const persisted = await readPersistentContext(origin);
  if (persisted) {
    // Age the memo from when the shared snapshot was built.
    snapshots.set(
      origin,
      persisted.context,
      persisted.expiresAt - SITEMAP_CONTEXT_TTL_MS,
    );
    return persisted.context;
  }

  const context = await buildSitemapContext(board, origin, source);
  const builtAt = Date.now();
  snapshots.set(origin, context, builtAt);
  await writePersistentContext(
    origin,
    context,
    builtAt + SITEMAP_CONTEXT_TTL_MS,
  );
  return context;
}

/** One `<sitemap>` per chunk file, each stamped with its bucket's freshness. */
export function sitemapIndexEntries(
  origin: string,
  context: SitemapContext,
): SitemapIndexEntry[] {
  return context.buckets.flatMap(({ bucket, lastModified, chunks }) =>
    chunks.map((_entries, chunkIndex) => {
      const url = `${origin}/sitemap/${bucketFilename(bucket, chunkIndex)}`;
      return lastModified ? { url, lastModified } : { url };
    }),
  );
}

export function findSitemapChunk(
  context: SitemapContext,
  bucket: SitemapBucket,
  chunkIndex: number,
): readonly SitemapEntry[] | undefined {
  return context.buckets
    .find((entry) => entry.bucket === bucket)
    ?.chunks.at(chunkIndex);
}

/** Test-only: isolate module-cache cases. */
export function resetSitemapContextCacheForTest(): void {
  contextCache = new WeakMap();
  edgeCacheRefused = false;
}
