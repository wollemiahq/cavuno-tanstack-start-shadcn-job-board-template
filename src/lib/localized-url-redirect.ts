/**
 * One URL per page: a document request for a path whose localized form
 * differs (/jobs on a Dutch board, /fr/jobs for French) gets a permanent
 * 308 to the localized URL, query preserved. Runs in the server entry
 * before rendering, so crawlers and old links consolidate on the localized
 * URL in one hop.
 *
 * Never for non-GET/HEAD requests (a 308 would replay a POST body
 * elsewhere) or machine paths (feeds, sitemaps, APIs, OG images). A
 * localized path maps to itself, so it never redirects — no loops.
 */
import {
  delocalizeSegments,
  isMachinePath,
  localizeSegments,
} from './localized-path';

import type { LocaleRouting } from './localized-path';

/** The localized path + query to redirect to, or null to serve as is. */
export function localizedRedirectLocation(
  request: Pick<Request, 'method' | 'url'>,
  routing?: LocaleRouting,
): string | null {
  if (request.method !== 'GET' && request.method !== 'HEAD') return null;
  const url = new URL(request.url);
  if (isMachinePath(url.pathname, routing)) return null;
  const localized = localizeSegments(
    delocalizeSegments(url.pathname, routing),
    routing,
  );
  if (localized === url.pathname) return null;
  return `${localized}${url.search}`;
}

export function localizedUrlRedirect(request: Request): Response | null {
  const location = localizedRedirectLocation(request);
  if (location === null) return null;
  return new Response(null, { status: 308, headers: { Location: location } });
}
