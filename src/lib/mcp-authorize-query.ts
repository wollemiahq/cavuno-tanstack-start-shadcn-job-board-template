/**
 * The query an assistant sends to `/oauth/authorize`, kept byte for byte.
 *
 * The router coerces search values that look like JSON and redirects a
 * document request to its own re-serialized URL before any loader runs, so
 * an OAuth `state` such as `1e3` or a long number would reach the Board API
 * changed, and the assistant would refuse the sign-in it gets back. The
 * server entry therefore first redirects the raw query into one `oauth`
 * value, base64url text the router leaves as it is, and the consent step
 * reads it back out (`mcpAuthorizeQuery`).
 */
export const MCP_AUTHORIZE_PATH = '/oauth/authorize';
const PARAM = 'oauth';

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
  const keys = [...params.keys()];
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
  if (url.pathname !== MCP_AUTHORIZE_PATH || !url.search) return null;
  if (keptValue(url.searchParams) !== null) return null;
  const kept = new URL(MCP_AUTHORIZE_PATH, url);
  kept.searchParams.set(PARAM, toBase64Url(url.search.slice(1)));
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
