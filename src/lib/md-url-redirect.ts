/**
 * Retired `.md` page URLs: a GET/HEAD for a page path ending in `.md`
 * (`/jobs.md`, `/fr/index.md`) gets a permanent 308 to the same path
 * without it (`/jobs`, `/fr`), query kept, so a reader that kept an old
 * `.md` link lands on the page. The page itself then applies its localized
 * URL redirect and not-found handling as usual.
 *
 * Never for non-GET/HEAD requests or machine paths (feeds, sitemaps,
 * robots.txt, OG images, APIs).
 */
import { isMachinePath, stripLocalePrefix } from './localized-path';

import type { LocaleRouting } from './localized-path';

const SUFFIX = '.md';

/** The page path + query to redirect to, or null to serve as is. */
export function mdUrlRedirectLocation(
  request: Pick<Request, 'method' | 'url'>,
  routing?: LocaleRouting,
): string | null {
  if (request.method !== 'GET' && request.method !== 'HEAD') return null;
  const url = new URL(request.url);
  if (!url.pathname.endsWith(SUFFIX)) return null;
  let page = url.pathname.slice(0, -SUFFIX.length);
  // `/x/.md` names no page; "//host" would read as another origin.
  if (page === '' || page.endsWith('/') || page.startsWith('//')) return null;
  // `/index.md` and `/fr/index.md` were the home page's.
  if (stripLocalePrefix(page, routing) === '/index') {
    page = page.slice(0, -'/index'.length) || '/';
  }
  if (isMachinePath(page, routing)) return null;
  return `${page}${url.search}`;
}

export function mdUrlRedirect(
  request: Request,
  routing?: LocaleRouting,
): Response | null {
  const location = mdUrlRedirectLocation(request, routing);
  if (location === null) return null;
  return new Response(null, {
    status: 308,
    headers: { Location: location, 'Cache-Control': 'max-age=86400' },
  });
}
