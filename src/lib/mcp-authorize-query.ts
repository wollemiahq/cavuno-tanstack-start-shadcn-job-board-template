/**
 * The query an assistant's sign-in link carries to this site's consent page
 * (`/authorize`, in the board's words), kept byte for byte.
 *
 * The router coerces search values that look like JSON and redirects a
 * document request to its own re-serialized URL before any loader runs, so
 * an OAuth `state` such as `1e3` or a long number would reach the Board API
 * changed, and the assistant would refuse the sign-in it gets back. The
 * server entry therefore first redirects the raw query into one `oauth`
 * value, base64url text the router leaves as it is, and the consent step
 * reads it back out (`mcpAuthorizeQuery`).
 */
import { AUTH_CONVERSION_PARAMS } from './board-datalayer-events';
import { canonicalPathname, localizePath } from './localized-path';

/** The consent page's canonical path; served under the board's own word. */
export const MCP_CONSENT_PATH = '/authorize';
const PARAM = 'oauth';

/**
 * The sign-in conversion markers a sign-in appends to its return. They stay
 * beside the kept query too, where the conversion tracker reads and strips
 * them; their values are words the router keeps.
 */
const AUTH_MARKERS: ReadonlySet<string> = new Set(AUTH_CONVERSION_PARAMS);

function isAuthMarker(key: string): boolean {
  return AUTH_MARKERS.has(key);
}

/**
 * The page's search without the markers, to key its loader on: the tracker
 * stripping them is not a different consent request, so it must not fetch
 * the step again.
 */
export function withoutAuthMarkers<T extends object>(search: T): Partial<T> {
  // SAFETY: only keys of `search` are kept, each with its own value.
  return Object.fromEntries(
    Object.entries(search).filter(([key]) => !isAuthMarker(key)),
  ) as Partial<T>;
}

function toBase64Url(text: string): string {
  return btoa(text)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');
}

function fromBase64Url(value: string): string {
  return atob(value.replaceAll('-', '+').replaceAll('_', '/'));
}

/** The `oauth` value when the search is exactly this site's kept form. */
function keptValue(params: URLSearchParams): string | null {
  const keys = [...params.keys()].filter((key) => !isAuthMarker(key));
  return keys.length === 1 && keys[0] === PARAM ? params.get(PARAM) : null;
}

/**
 * A redirect that keeps the assistant's raw query, or null when the request
 * is not an authorize page load or its query is already kept. The query of
 * a URL is ASCII (anything else is percent-encoded), so `btoa` takes it.
 */
export function mcpAuthorizeRedirect(request: Request): Response | null {
  if (request.method !== 'GET' && request.method !== 'HEAD') return null;
  const url = new URL(request.url);
  if (!url.search || canonicalPathname(url.pathname) !== MCP_CONSENT_PATH) {
    return null;
  }
  if (keptValue(url.searchParams) !== null) return null;
  const kept = new URL(url.pathname, url);
  kept.searchParams.set(PARAM, toBase64Url(url.search.slice(1)));
  for (const [key, value] of url.searchParams) {
    if (isAuthMarker(key)) kept.searchParams.append(key, value);
  }
  return new Response(null, {
    status: 307,
    headers: { location: `${kept.pathname}${kept.search}` },
  });
}

/**
 * The query to send the Board API for the page's (router) search string:
 * the kept query decoded, or the search itself on a client-side navigation
 * here (as after sign-in). Only ever a query, so no caller can change the
 * API path it is appended to.
 */
export function mcpAuthorizeQuery(search: string): string {
  if (!search.startsWith('?')) return '';
  const kept = keptValue(new URLSearchParams(search));
  if (kept === null) return search;
  try {
    return `?${fromBase64Url(kept)}`;
  } catch {
    // Not one this site made: the API answers an empty request with its
    // own error step.
    return '';
  }
}

/**
 * This page, in the board's words, with the query of the Board API's
 * `returnTo` (which names Cavuno's `/oauth/authorize`): sign-in comes back
 * here directly.
 */
export function mcpConsentReturnTo(returnTo: string): string {
  const { search } = new URL(returnTo, 'https://board.invalid');
  return `${localizePath(MCP_CONSENT_PATH)}${search}`;
}
