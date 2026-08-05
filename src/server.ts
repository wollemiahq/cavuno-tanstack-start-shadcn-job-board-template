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
 */
import handler from '@tanstack/react-start/server-entry';

import { LOCALE_HEADER } from './lib/locale-middleware';
import {
  readPublicHtmlCache,
  withPublicHtmlCacheHeaders,
  writePublicHtmlCache,
} from './lib/public-html-cache';
import { withBaselineSecurityHeaders } from './lib/security-headers';
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

export default {
  async fetch(
    request: Request,
    _env?: unknown,
    executionContext?: { waitUntil(promise: Promise<unknown>): void },
  ): Promise<Response> {
    const cached = await readPublicHtmlCache(request);
    if (cached) return cached;

    const rendered = await paraglideMiddleware(
      localeDetectionRequest(request),
      () => handler.fetch(request),
    );
    const response = withPublicHtmlCacheHeaders(
      request,
      withBaselineSecurityHeaders(rendered),
    );
    const cacheWrite = writePublicHtmlCache(request, response);
    if (cacheWrite) {
      if (executionContext) executionContext.waitUntil(cacheWrite);
      else void cacheWrite.catch(() => undefined);
    }
    return response;
  },
};
