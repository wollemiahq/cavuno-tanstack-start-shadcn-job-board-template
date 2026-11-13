/**
 * Markdown twins: `/x.md` is a Markdown version of the public page `/x`,
 * for agents and other text readers.
 *
 * This module is the single allowlist of pages that have a twin, and the
 * pure resolver from a request to that page. It imports no data code, so
 * the server entry can call it before anything renders.
 *
 * Paths are matched in canonical (English) words with the locale prefix
 * removed, against templates from src/lib/route-templates.ts; the twin URL
 * itself is the page's localized URL plus `.md` (`/vacatures.md`,
 * `/fr/emplois.md`, `/index.md` for the home page). A twin asked for under
 * a canonical or retired word 308s to the localized twin URL.
 *
 * A GET or HEAD for the page URL itself whose Accept lists `text/markdown`
 * with q above 0 gets the same twin (negotiatedMarkdownTwin); browsers,
 * which never list it, keep the HTML page.
 *
 * The twin is answered by one server route (MARKDOWN_TWIN_ROUTE): the
 * server entry rewrites a resolved twin to it, and refuses outside requests
 * for that prefix, so the route only ever sees a rewritten request.
 */
import {
  canonicalPathname,
  isMachinePath,
  stripLocalePrefix,
  type LocaleRouting,
} from '../localized-path';
import { localizedRedirectLocation } from '../localized-url-redirect';

import type { ROUTE_TEMPLATES } from '../route-templates';

export const MARKDOWN_SUFFIX = '.md';

/** The internal server route that answers every twin. */
export const MARKDOWN_TWIN_ROUTE = '/markdown-twin';

/** The pages with a twin: canonical route template and builder kind. */
export const MARKDOWN_TWIN_PAGES = [
  { kind: 'home', template: '/' },
  { kind: 'jobs', template: '/jobs/' },
  { kind: 'jobsCategory', template: '/jobs/$keyword' },
  { kind: 'jobsSkill', template: '/jobs/skills/$skill' },
  { kind: 'jobsLocations', template: '/jobs/locations/' },
  { kind: 'jobsLocation', template: '/jobs/locations/$location/' },
  {
    kind: 'jobsLocationCategory',
    template: '/jobs/locations/$location/$keyword',
  },
  {
    kind: 'jobsLocationSkill',
    template: '/jobs/locations/$location/skills/$skill',
  },
  { kind: 'job', template: '/companies/$companySlug/jobs/$jobSlug' },
  { kind: 'companies', template: '/companies/' },
  { kind: 'companyMarket', template: '/companies/markets/$market' },
  { kind: 'company', template: '/companies/$companySlug/' },
  { kind: 'companyJobs', template: '/companies/$companySlug/jobs/' },
  { kind: 'blog', template: '/blog/' },
  { kind: 'blogPost', template: '/blog/$postSlug' },
  { kind: 'blogTag', template: '/blog/tag/$tagSlug' },
] as const satisfies readonly {
  kind: string;
  template: (typeof ROUTE_TEMPLATES)[number];
}[];

export type MarkdownTwinKind = (typeof MARKDOWN_TWIN_PAGES)[number]['kind'];

export interface MarkdownTwin {
  kind: MarkdownTwinKind;
  /** Route params by name, percent-decoded like the router's. */
  params: Record<string, string>;
  /** The HTML page's path as requested (localized, locale prefix kept). */
  htmlPath: string;
  /** The twin's path as requested (`htmlPath` plus `.md`). */
  twinPath: string;
  /** The request's query string (`?page=2`), or `''`. */
  search: string;
}

/** The twin path for a localized page path: `/` is `/index.md`. */
export function markdownPathFor(
  localizedPath: string,
  routing?: LocaleRouting,
): string {
  const path = localizedPath.replace(/\/+$/, '');
  // The home page, bare or under a locale prefix (`/fr`).
  if (stripLocalePrefix(path || '/', routing) === '/') {
    return `${path}/index.md`;
  }
  return `${path}${MARKDOWN_SUFFIX}`;
}

/** The page path behind a twin path (`/index.md` is `/`), or null when
 * it is not one. */
export function markdownTwinPagePath(
  twinPath: string,
  routing?: LocaleRouting,
): string | null {
  if (!twinPath.endsWith(MARKDOWN_SUFFIX)) return null;
  const path = twinPath.slice(0, -MARKDOWN_SUFFIX.length);
  // `/x.md.md` is a twin of a twin; `/x/.md` names no page.
  if (path.endsWith(MARKDOWN_SUFFIX) || path.endsWith('/')) return null;
  if (path === '/index') return '/';
  const unprefixed = stripLocalePrefix(path, routing);
  if (unprefixed === '/index') {
    return path.slice(0, -'/index'.length);
  }
  return path;
}

function decodeSegment(segment: string): string | null {
  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
}

/** Route params when `segments` fit `template`, else null. */
function matchTemplate(
  template: string,
  segments: readonly string[],
): { params: Record<string, string>; staticSegments: number } | null {
  const parts = template.split('/').filter(Boolean);
  if (parts.length !== segments.length) return null;
  const params: Record<string, string> = {};
  let staticSegments = 0;
  for (const [index, part] of parts.entries()) {
    const segment = segments[index]!;
    if (part.startsWith('$')) {
      const value = decodeSegment(segment);
      if (value === null) return null;
      params[part.slice(1)] = value;
    } else if (part === segment) {
      staticSegments += 1;
    } else {
      return null;
    }
  }
  return { params, staticSegments };
}

/** The twin a GET or HEAD request asks for by its `.md` URL, or null. */
export function resolveMarkdownTwin(
  request: Pick<Request, 'method' | 'url'>,
  routing?: LocaleRouting,
): MarkdownTwin | null {
  if (request.method !== 'GET' && request.method !== 'HEAD') return null;
  const url = new URL(request.url);
  const twinPath = url.pathname;
  if (twinPath.startsWith('//')) return null;
  const htmlPath = markdownTwinPagePath(twinPath, routing);
  if (htmlPath === null || isMachinePath(htmlPath, routing)) return null;
  const segments = canonicalPathname(htmlPath, routing)
    .split('/')
    .filter(Boolean);
  // Like the router, a static segment beats a param: `/jobs/locations`
  // is the locations directory, not a category called "locations".
  let best: { twin: MarkdownTwin; staticSegments: number } | null = null;
  for (const page of MARKDOWN_TWIN_PAGES) {
    const match = matchTemplate(page.template, segments);
    if (!match || (best && best.staticSegments >= match.staticSegments)) {
      continue;
    }
    best = {
      twin: {
        kind: page.kind,
        params: match.params,
        htmlPath,
        twinPath,
        search: url.search,
      },
      staticSegments: match.staticSegments,
    };
  }
  return best?.twin ?? null;
}

/** True when an Accept header lists `text/markdown` with q above 0. */
export function acceptsMarkdown(accept: string | null): boolean {
  if (!accept) return false;
  return accept.split(',').some((entry) => {
    const [type, ...params] = entry.split(';').map((part) => part.trim());
    if (type?.toLowerCase() !== 'text/markdown') return false;
    const q = params.find((param) => /^q\s*=/i.test(param));
    if (q === undefined) return true;
    const value = Number(q.slice(q.indexOf('=') + 1).trim());
    return Number.isFinite(value) && value > 0;
  });
}

/** The twin of the page a GET or HEAD request addresses by its HTML URL
 * (whatever its Accept), or null when the page has none. */
export function pageMarkdownTwin(
  request: Pick<Request, 'method' | 'url'>,
  routing?: LocaleRouting,
): MarkdownTwin | null {
  const url = new URL(request.url);
  const pagePath = url.pathname.replace(/\/+$/, '') || '/';
  if (pagePath.endsWith(MARKDOWN_SUFFIX)) return null;
  url.pathname = markdownPathFor(pagePath, routing);
  const twin = resolveMarkdownTwin(
    { method: request.method, url: url.href },
    routing,
  );
  // `/index` would otherwise borrow the home page's `/index.md`.
  return twin && twin.htmlPath === pagePath ? twin : null;
}

/** The twin a page request negotiates with `Accept: text/markdown`, or
 * null. A page asked for under canonical or retired words is left to the
 * localized URL redirect, and the agent negotiates again there. */
export function negotiatedMarkdownTwin(
  request: Pick<Request, 'method' | 'url' | 'headers'>,
  routing?: LocaleRouting,
): MarkdownTwin | null {
  if (!acceptsMarkdown(request.headers.get('Accept'))) return null;
  const twin = pageMarkdownTwin(request, routing);
  if (!twin || markdownTwinRedirectLocation(request, twin, routing)) {
    return null;
  }
  return twin;
}

/** The same request addressed to its twin's `.md` URL (query kept). */
export function markdownTwinUrlRequest(
  request: Request,
  twin: MarkdownTwin,
): Request {
  const url = new URL(request.url);
  url.pathname = twin.twinPath;
  return new Request(url, request);
}

/**
 * Where a twin asked for under canonical or retired words lives (the
 * localized twin URL, query kept), or null when it is already there.
 */
export function markdownTwinRedirectLocation(
  request: Pick<Request, 'method' | 'url'>,
  twin: MarkdownTwin,
  routing?: LocaleRouting,
): string | null {
  const url = new URL(request.url);
  const page = new URL(twin.htmlPath, url.origin);
  const location = localizedRedirectLocation(
    { method: request.method, url: page.href },
    routing,
  );
  if (location === null) return null;
  return `${markdownPathFor(location, routing)}${url.search}`;
}

/** True for a path under the internal twin route, with or without a
 * locale prefix. */
export function isMarkdownTwinRoutePath(
  pathname: string,
  routing?: LocaleRouting,
): boolean {
  const path = stripLocalePrefix(pathname, routing);
  return (
    path === MARKDOWN_TWIN_ROUTE || path.startsWith(`${MARKDOWN_TWIN_ROUTE}/`)
  );
}

/** The request the server entry hands to Start for a resolved twin: the
 * same request, addressed to the internal twin route. */
export function markdownTwinRouteRequest(request: Request): Request {
  const url = new URL(request.url);
  url.pathname = `${MARKDOWN_TWIN_ROUTE}${url.pathname}`;
  return new Request(url, request);
}

/** The original twin URL behind a rewritten twin-route request. */
export function markdownTwinRequestUrl(routeRequestUrl: string): URL {
  const url = new URL(routeRequestUrl);
  if (isMarkdownTwinRoutePath(url.pathname)) {
    url.pathname = url.pathname.slice(MARKDOWN_TWIN_ROUTE.length) || '/';
  }
  return url;
}
