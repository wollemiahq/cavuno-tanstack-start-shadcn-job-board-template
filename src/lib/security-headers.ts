import { isLocale } from '../paraglide/runtime';

/**
 * Low-risk headers the starter can apply to every response without knowing a
 * tenant's integrations or deployment domain.
 *
 * Deliberately absent here: a content policy for scripts/styles/media (tenant
 * media, Stripe, and inline bootstraps need a per-deployment policy), HSTS
 * (operator/domain policy), and broad browser feature restrictions that could
 * block an adopter's customization.
 *
 * Framing IS handled — see `withBaselineSecurityHeaders`. It used to be
 * omitted wholesale because `/embed/jobs` has to stay embeddable, which left
 * `/settings`, `/password` and the company danger zone clickjackable on every
 * fork. Embeddability is per route, so the header is too.
 */
export const BASELINE_SECURITY_HEADERS = {
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Content-Type-Options': 'nosniff',
} as const;

/**
 * Framing denial for everything that is not the embed widget.
 *
 * `frame-ancestors` is the only directive here on purpose: a CSP carrying it
 * alone constrains framing and nothing else, so it cannot break a tenant's
 * scripts, styles or media the way a full policy would. `X-Frame-Options`
 * rides along for browsers that predate it.
 */
export const FRAMING_DENIED_HEADERS = {
  'Content-Security-Policy': "frame-ancestors 'none'",
  'X-Frame-Options': 'DENY',
} as const;

/**
 * Is this path the embed widget — the one surface that must stay framable?
 *
 * Locale-prefixed URLs (`/de/embed/jobs`) are the same route, so the leading
 * segment is dropped when it is a known locale. Anything else keeps its
 * segment, so a company slugged "de" cannot smuggle a page out of the deny.
 */
export function isEmbeddablePath(pathname: string): boolean {
  const segments = pathname.split('/').filter(Boolean);
  const rest =
    segments.length > 0 && isLocale(segments[0]) ? segments.slice(1) : segments;
  return rest[0] === 'embed';
}

/** Add the starter baseline while preserving any stricter route override. */
export function withBaselineSecurityHeaders(
  response: Response,
  request: Request,
): Response {
  const headers = new Headers(response.headers);
  const setIfAbsent = (name: string, value: string) => {
    if (!headers.has(name)) headers.set(name, value);
  };
  for (const [name, value] of Object.entries(BASELINE_SECURITY_HEADERS)) {
    setIfAbsent(name, value);
  }
  if (!isEmbeddablePath(new URL(request.url).pathname)) {
    for (const [name, value] of Object.entries(FRAMING_DENIED_HEADERS)) {
      setIfAbsent(name, value);
    }
  }
  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  });
}
