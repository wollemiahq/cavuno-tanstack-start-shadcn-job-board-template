import { readAudienceCookie } from './audience-attribution';
import { parseCookieConsent } from './cookie-consent';

import type { BoardRequest } from '@cavuno/board';

const BODY_ROUTES = new Set([
  'POST auth/register',
  'POST auth/magic-link',
  'POST job-alerts',
  'POST me/alerts',
  'PUT me/notification-preferences',
]);
const OAUTH_ROUTES = new Set(['auth/oauth/google', 'auth/oauth/linkedin']);

/** Enrich only audience-producing calls using this incoming request's cookie. */
export function applyAudienceAttribution(
  request: BoardRequest,
  readCookies: () => string | null | undefined,
  readCountry?: () => string | undefined,
): BoardRequest {
  const url = new URL(request.url);
  const match = url.pathname.match(/\/boards\/([^/]+)\/(.+)$/);
  if (!match) return request;
  const method = (request.init.method ?? 'GET').toUpperCase();
  const route = match[2];
  const bodyRoute = BODY_ROUTES.has(`${method} ${route}`);
  const oauthRoute = method === 'GET' && OAUTH_ROUTES.has(route);
  if (!bodyRoute && !oauthRoute) return request;
  const cookieHeader = readCookies();
  try {
    if (parseCookieConsent(cookieHeader) === 'denied') return request;
  } catch {
    return request;
  }
  let board: string;
  try {
    board = decodeURIComponent(match[1]);
  } catch {
    return request;
  }
  const attribution = readAudienceCookie(cookieHeader, board);
  if (!attribution) return request;
  const country = readCountry?.();
  if (
    country &&
    /^[A-Z]{2}$/.test(country) &&
    !['XX', 'T1'].includes(country)
  ) {
    attribution.location = country;
  }
  if (oauthRoute) {
    url.searchParams.set('audienceAttribution', JSON.stringify(attribution));
    request.url = url.toString();
    // The SDK hook receives raw fetch bodies, so JSON enrichment needs this I/O guard.
    // oxlint-disable-next-line anti-slop/no-runtime-typeof
  } else if (typeof request.init.body === 'string') {
    try {
      const body: unknown = JSON.parse(request.init.body);
      // JSON bodies from the SDK must be objects before adding evidence.
      // oxlint-disable-next-line anti-slop/no-runtime-typeof
      if (!body || typeof body !== 'object' || Array.isArray(body))
        return request;
      request.init.body = JSON.stringify({
        ...body,
        audienceAttribution: attribution,
      });
    } catch {
      // Unexpected bodies pass through unchanged.
    }
  }
  return request;
}
