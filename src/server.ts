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

import { matchClientErrorIngest } from './lib/client-error-ingest';
import { CLIENT_ERROR_PATH } from './lib/client-error-report';
import { getServerEnv } from './lib/env';
import { LOCALE_HEADER } from './lib/locale-middleware';
import { localizedUrlRedirect } from './lib/localized-url-redirect';
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

const startHandler = createStartHandler(defaultStreamHandler);

interface WorkerEnvironment {}

type ExecutionContext = { waitUntil(promise: Promise<unknown>): void };

async function serve(
  request: Request,
  executionContext?: ExecutionContext,
): Promise<Response> {
  const pathname = new URL(request.url).pathname;
  if (pathname === CLIENT_ERROR_PATH || pathname === `${CLIENT_ERROR_PATH}/`) {
    const clientError = await matchClientErrorIngest(
      request,
      getServerEnv(),
      executionContext?.waitUntil.bind(executionContext),
    );
    if (clientError) return withBaselineSecurityHeaders(clientError, request);
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
    () => startHandler(request),
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
