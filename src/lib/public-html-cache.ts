import { delocalizeSegments } from './localized-path';

/**
 * Anonymous public-document caching policy.
 *
 * Identity-bearing requests never touch this cache. That invariant lets the
 * public HTML stay fast without making the authenticated shell client-only or
 * risking one viewer's server-rendered state being served to another.
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

const IDENTITY_COOKIE_PREFIXES = [
  '__Host-cavuno_board_access',
  '__Host-cavuno_board_session',
  'cavuno_data_source',
  // Not identity, but SSR output varies on it (banner + dehydrated
  // consentChoice), and the edge cache does not honor Vary: Cookie — a
  // decided visitor's banner-less document must never be stored for, or
  // served to, undecided visitors.
  'cavuno_cookie_consent',
] as const;

const BROWSER_CACHE_CONTROL = 'public, max-age=0, must-revalidate';
const EDGE_CACHE_CONTROL = 'public, max-age=60, stale-while-revalidate=300';

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

function carriesIdentity(cookieHeader: string | null): boolean {
  if (!cookieHeader) return false;
  const names = cookieHeader
    .split(';')
    .map((part) => part.trim().split('=')[0]);
  return names.some((name) =>
    IDENTITY_COOKIE_PREFIXES.some((prefix) => name.startsWith(prefix)),
  );
}

/** True only for GET documents whose SSR output is anonymous and public. */
export function isAnonymousPublicDocumentRequest(request: Request): boolean {
  if (request.method !== 'GET') return false;
  if (!isPublicDocumentPath(new URL(request.url).pathname)) return false;
  if (request.headers.has('authorization')) return false;
  return !carriesIdentity(request.headers.get('cookie'));
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
  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  });
}

function defaultEdgeCache(): Cache | undefined {
  return (globalThis as unknown as { caches?: EdgeCacheStorage }).caches
    ?.default;
}

/** Cloudflare Cache API fast path; a no-op on other TanStack runtimes. */
export async function readPublicHtmlCache(
  request: Request,
): Promise<Response | undefined> {
  if (!isAnonymousPublicDocumentRequest(request)) return undefined;
  return (await defaultEdgeCache()?.match(request)) ?? undefined;
}

export function writePublicHtmlCache(
  request: Request,
  response: Response,
): Promise<void> | undefined {
  if (
    !isAnonymousPublicDocumentRequest(request) ||
    response.headers.get('cache-control') !== BROWSER_CACHE_CONTROL
  ) {
    return undefined;
  }
  return defaultEdgeCache()?.put(request, response.clone());
}
