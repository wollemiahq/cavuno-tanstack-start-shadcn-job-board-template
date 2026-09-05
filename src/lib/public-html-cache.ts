import { delocalizeSegments } from './localized-path';

/**
 * Anonymous public-document caching policy.
 *
 * Requests that carry a doc-vary cookie never touch this cache. That
 * invariant lets the public HTML stay fast without making the authenticated
 * shell client-only or risking one viewer's server-rendered state being
 * served to another.
 */

const PUBLIC_DOCUMENT_PREFIXES = [
  '/blog',
  '/companies',
  '/jobs',
  '/p',
  '/salaries',
  '/talent',
] as const;

const PUBLIC_DOCUMENT_PATHS = new Set([
  '/',
  '/about',
  '/cookie-policy',
  '/employers',
  '/impressum',
  '/privacy-policy',
  '/terms-of-service',
]);

/**
 * Cookie prefixes that still influence public-document SSR.
 *
 * Consumed by the platform dispatch worker (builder-live-gateway
 * html-cache.ts): a cached copy may be served to a cookie-bearing request
 * only when none of its cookie names start with these prefixes. Templates
 * that SSR new viewer state MUST add its cookie prefix here or stop
 * stamping `X-Cavuno-Doc-Vary`.
 *
 * Consent (`cavuno_cookie_consent`) is deliberately absent — the banner is
 * a client island, so consented and undecided visitors share one document.
 * The worker-side cache in this repo and the `Cloudflare-CDN-Cache-Control`
 * opt-in therefore also apply to consented visitors.
 *
 * Audited: account.ts:78 and applications.ts:110 cookie reads are POST/non-public-document only.
 */
export const DOC_VARY_COOKIE_PREFIXES = [
  '__Host-cavuno_board_access',
  '__Host-cavuno_board_session',
  'cavuno_data_source',
] as const;

const BROWSER_CACHE_CONTROL = 'public, max-age=0, must-revalidate';
/**
 * The platform gateway's edge-cache opt-in value. Exported because it is the
 * starter's one edge-freshness contract: any public response that wants the
 * gateway to serve it from cache (HTML here, the OG cards in og-render.ts)
 * sends THIS on `Cloudflare-CDN-Cache-Control`. The gateway caps the fresh
 * window at 300s and keys on the board content version, so a board edit
 * still invalidates.
 */
export const EDGE_CACHE_CONTROL =
  'public, max-age=60, stale-while-revalidate=300';

type EdgeCacheStorage = { default?: Cache };

function pathnameWithoutLocale(pathname: string): string {
  // Localized section slugs (/fr/emplois, /de/gehaelter) must normalize to
  // their canonical sections BEFORE the locale prefix is stripped, or the
  // whole translated-slug surface silently loses the edge cache.
  const canonicalSections = delocalizeSegments(pathname);
  const stripped = canonicalSections.replace(
    /^\/[a-z]{2,3}(?:-[A-Z]{2})?(?=\/|$)/,
    '',
  );
  return stripped || '/';
}

export function isPublicDocumentPath(pathname: string): boolean {
  const normalized = pathnameWithoutLocale(pathname);
  if (PUBLIC_DOCUMENT_PATHS.has(normalized)) return true;
  return PUBLIC_DOCUMENT_PREFIXES.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`),
  );
}

function carriesDocVaryCookie(cookieHeader: string | null): boolean {
  if (!cookieHeader) return false;
  const names = cookieHeader
    .split(';')
    .map((part) => part.trim().split('=')[0]);
  return names.some((name) =>
    DOC_VARY_COOKIE_PREFIXES.some((prefix) => name.startsWith(prefix)),
  );
}

/** True only for GET documents whose SSR output is anonymous and public. */
export function isAnonymousPublicDocumentRequest(request: Request): boolean {
  if (request.method !== 'GET') return false;
  if (!isPublicDocumentPath(new URL(request.url).pathname)) return false;
  if (request.headers.has('authorization')) return false;
  return !carriesDocVaryCookie(request.headers.get('cookie'));
}

/** Attach separate browser and shared-edge freshness policies. */
export function withPublicHtmlCacheHeaders(
  request: Request,
  response: Response,
): Response {
  if (
    !isAnonymousPublicDocumentRequest(request) ||
    response.status !== 200 ||
    response.headers.has('set-cookie') ||
    !response.headers.get('content-type')?.includes('text/html')
  ) {
    return response;
  }

  const headers = new Headers(response.headers);
  headers.set('Cache-Control', BROWSER_CACHE_CONTROL);
  headers.set('Cloudflare-CDN-Cache-Control', EDGE_CACHE_CONTROL);
  headers.append('Vary', 'Cookie');
  headers.set('X-Cavuno-Doc-Vary', DOC_VARY_COOKIE_PREFIXES.join(', '));
  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  });
}

/**
 * Some runtimes REFUSE the default cache rather than omitting it.
 *
 * Workers for Platforms is the one that matters: a dispatched user Worker
 * still has a `caches` global, but touching the default cache throws
 *
 *     Error: This Worker is not permitted to access the default cache.
 *
 * An `?.` guard only covers runtimes where `caches` is ABSENT, so under
 * WFP that throw escaped the fetch handler and every cacheable public
 * route answered a bare Cloudflare 1101 — while uncacheable ones
 * (/post, /password, /embed/*) rendered perfectly, because they never
 * reach this code. Local `vite preview`, CI, and any ordinary Worker all
 * permit the cache, so nothing short of a real WFP deploy sees it.
 *
 * Latched: once refused, stop asking. The answer cannot change within an
 * isolate, and re-throwing per request costs latency on exactly the pages
 * this cache exists to make fast.
 */
let edgeCacheRefused = false;

function defaultEdgeCache(): Cache | undefined {
  if (edgeCacheRefused) return undefined;
  try {
    // SAFETY: Cloudflare Workers expose `globalThis.caches.default`; optional
    // access preserves non-Worker environments where the binding is absent.
    return (globalThis as { caches?: EdgeCacheStorage }).caches?.default;
  } catch {
    edgeCacheRefused = true;
    return undefined;
  }
}

/**
 * Cloudflare Cache API fast path; a no-op on runtimes that lack the
 * default cache OR refuse it. Never throws: a cache miss and a cache
 * that is not allowed must look identical to the caller.
 */
export async function readPublicHtmlCache(
  request: Request,
): Promise<Response | undefined> {
  if (!isAnonymousPublicDocumentRequest(request)) return undefined;
  try {
    return (await defaultEdgeCache()?.match(request)) ?? undefined;
  } catch {
    edgeCacheRefused = true;
    return undefined;
  }
}

export async function writePublicHtmlCache(
  request: Request,
  response: Response,
): Promise<void> {
  if (
    !isAnonymousPublicDocumentRequest(request) ||
    response.headers.get('cache-control') !== BROWSER_CACHE_CONTROL
  ) {
    return;
  }
  try {
    await defaultEdgeCache()?.put(request, response.clone());
  } catch {
    // Same posture as the read: a refused or failing cache must never
    // turn a rendered page into an error.
    edgeCacheRefused = true;
  }
}

/** Test seam — the latch is module state and would leak across cases. */
export function resetEdgeCacheRefusalForTest(): void {
  edgeCacheRefused = false;
}
