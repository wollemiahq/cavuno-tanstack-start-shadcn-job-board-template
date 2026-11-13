/**
 * Custom server entry: every request runs inside `paraglideMiddleware`,
 * which resolves the locale from the URL (strategy: ['url','baseLocale'])
 * and scopes it in AsyncLocalStorage so `getLocale()` works in loaders,
 * server functions, and the copy seam during SSR.
 *
 * Server-fn RPCs (/_serverFn/*) carry no locale prefix, and Paraglide's
 * default URL pattern always resolves SOMETHING for an unprefixed path
 * (baseLocale). The client attaches the tab's own locale as a request
 * header (src/lib/locale-middleware.ts) — per-tab and per-request, unlike
 * a cookie, so two tabs in different locales never bleed into each other.
 * For RPC requests we hand the middleware a locale-prefixed URL for
 * DETECTION ONLY; the app handler still receives the original request.
 *
 * Footgun (TanStack + Paraglide docs): pass the ORIGINAL request to the
 * handler, not the delocalized one the middleware offers — the router's
 * `rewrite.input` owns delocalization; feeding it an already-delocalized
 * URL loops the redirect.
 *
 * A page request whose Accept names neither text/html nor *\/* (an agent
 * asking for text/markdown, say) would get Start's 406; it gets the HTML
 * page instead (htmlPageRequest).
 *
 * Markdown twins: a `/x.md` URL for a page with a twin
 * (src/lib/markdown-twin/routes.ts) is handed to Start addressed to the
 * internal twin route, with the original URL still used for locale
 * detection and the cache key. Outside requests for that route 404.
 *
 * An uncaught server error, or a 500 that Start rendered itself, logs one
 * `starter_server_error` line (src/lib/server-error-log.server.ts).
 *
 * Error handling: the raw `createStartHandler` rethrows the original error
 * (Start 1.0), so `serveWithServerErrorLog` sees and logs it. The whole
 * entry runs inside `createServerEntry`, which turns the rethrown error into
 * Start's generic 500 response (`handleStartError`) within the same request
 * scope, so cookies and headers set through Start's helpers still apply. The
 * built-in `@tanstack/react-start/server-entry` is not used because it
 * converts the error itself, before this entry could log it.
 */
import {
  createServerEntry,
  createStartHandler,
  defaultStreamHandler,
} from '@tanstack/react-start/server';

import { captureAuthFlow } from './lib/auth-flow';
import { matchClientErrorIngest } from './lib/client-error-ingest';
import { CLIENT_ERROR_PATH } from './lib/client-error-report';
import { getServerEnv } from './lib/env';
import { LOCALE_HEADER } from './lib/locale-middleware';
import { isMachinePath } from './lib/localized-path';
import { localizedUrlRedirect } from './lib/localized-url-redirect';
import {
  isMarkdownTwinRoutePath,
  markdownTwinRedirectLocation,
  markdownTwinRouteRequest,
  resolveMarkdownTwin,
} from './lib/markdown-twin/routes';
import {
  readPublicHtmlCache,
  withPublicHtmlCacheHeaders,
  writePublicHtmlCache,
} from './lib/public-html-cache';
import { withBaselineSecurityHeaders } from './lib/security-headers';
import { serveWithServerErrorLog } from './lib/server-error-log.server';
import { isLocale } from './paraglide/runtime';
import { paraglideMiddleware } from './paraglide/server';

/** For /_serverFn requests: a clone whose URL carries the client-sent
 * locale header as a path prefix, so the 'url' strategy resolves the
 * VIEWER's locale. The header is client-controlled but only ever selects
 * among known locales (isLocale guard) — it picks a language, nothing
 * else. */
function localeDetectionRequest(request: Request): Request {
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/_serverFn')) return request;
  const locale = request.headers.get(LOCALE_HEADER);
  if (!locale || !isLocale(locale)) return request;
  url.pathname = `/${locale}${url.pathname}`;
  // Detection-only clone: never construct from the original request — that
  // can disturb a POST RPC's body stream, which the real handler still
  // needs. The middleware only reads the URL (and headers) here.
  return new Request(url, { method: 'GET', headers: request.headers });
}

/** Start's own test: a page render answers 406 unless Accept matches. */
const ACCEPTS_HTML = /(^|,)\s*(\*\/\*|text\/html)/;
const HTML_ACCEPT = 'text/html,*/*;q=0.8';

/** For a GET/HEAD page request whose Accept rules out HTML: a copy that
 * accepts HTML, so the page renders instead of a 406. Machine paths
 * (server functions, feeds, sitemaps, robots.txt, OG images) keep the
 * request as sent. */
function htmlPageRequest(request: Request): Request {
  if (request.method !== 'GET' && request.method !== 'HEAD') return request;
  const accept = request.headers.get('Accept');
  if (!accept || ACCEPTS_HTML.test(accept)) return request;
  if (isMachinePath(new URL(request.url).pathname)) return request;
  const headers = new Headers(request.headers);
  headers.set('Accept', HTML_ACCEPT);
  return new Request(request, { headers });
}

const startHandler = createStartHandler(defaultStreamHandler);

interface WorkerEnvironment {}

type ExecutionContext = { waitUntil(promise: Promise<unknown>): void };

async function serve(
  request: Request,
  executionContext?: ExecutionContext,
): Promise<Response> {
  const authFlow = captureAuthFlow(request);
  if (authFlow) return withBaselineSecurityHeaders(authFlow, request);
  const pathname = new URL(request.url).pathname;
  if (pathname === CLIENT_ERROR_PATH || pathname === `${CLIENT_ERROR_PATH}/`) {
    const clientError = await matchClientErrorIngest(
      request,
      getServerEnv(),
      executionContext?.waitUntil.bind(executionContext),
    );
    if (clientError) return withBaselineSecurityHeaders(clientError, request);
  }

  if (isMarkdownTwinRoutePath(pathname)) {
    return withBaselineSecurityHeaders(
      new Response('Not Found\n', {
        status: 404,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      }),
      request,
    );
  }
  const twin = resolveMarkdownTwin(request);
  const twinRedirect = twin && markdownTwinRedirectLocation(request, twin);
  if (twinRedirect) {
    return withBaselineSecurityHeaders(
      new Response(null, {
        status: 308,
        headers: { Location: twinRedirect, 'Cache-Control': 'max-age=86400' },
      }),
      request,
    );
  }

  // Canonical (English) segments 308 to the board's localized URL before
  // anything renders or reads the cache; the router rewrite stays the
  // client-side safety net.
  const localizedRedirect = localizedUrlRedirect(request);
  if (localizedRedirect) {
    return withBaselineSecurityHeaders(localizedRedirect, request);
  }

  const cached = await readPublicHtmlCache(request);
  if (cached) return cached;

  const rendered = await paraglideMiddleware(
    localeDetectionRequest(request),
    () =>
      startHandler(
        twin ? markdownTwinRouteRequest(request) : htmlPageRequest(request),
      ),
  );
  const response = withPublicHtmlCacheHeaders(
    request,
    withBaselineSecurityHeaders(rendered, request),
  );
  // Always a promise now, and one that never rejects — a cache the
  // runtime refuses must not turn a rendered page into an error.
  const cacheWrite = writePublicHtmlCache(request, response);
  if (executionContext) executionContext.waitUntil(cacheWrite);
  else void cacheWrite;
  return response;
}

export default {
  fetch(
    request: Request,
    _env?: WorkerEnvironment,
    executionContext?: ExecutionContext,
  ): Promise<Response> {
    const entry = createServerEntry({
      fetch: (incoming: Request) =>
        serveWithServerErrorLog(
          incoming,
          () => serve(incoming, executionContext),
          () => getServerEnv().board,
        ),
    });
    return Promise.resolve(entry.fetch(request));
  },
};
