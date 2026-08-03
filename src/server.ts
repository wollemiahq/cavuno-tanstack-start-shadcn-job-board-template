/**
 * Custom server entry: every request runs inside `paraglideMiddleware`,
 * which resolves the locale from the URL (strategy: ['url','baseLocale'])
 * and scopes it in AsyncLocalStorage so `getLocale()` works in loaders,
 * server functions, and the copy seam during SSR.
 *
 * Footgun (TanStack + Paraglide docs): pass the ORIGINAL request to the
 * handler, not the delocalized one the middleware offers — the router's
 * `rewrite.input` owns delocalization; feeding it an already-delocalized
 * URL loops the redirect.
 */
import handler from '@tanstack/react-start/server-entry';

import {
  readPublicHtmlCache,
  withPublicHtmlCacheHeaders,
  writePublicHtmlCache,
} from './lib/public-html-cache';
import { withBaselineSecurityHeaders } from './lib/security-headers';
import { paraglideMiddleware } from './paraglide/server';

export default {
  async fetch(
    request: Request,
    _env?: unknown,
    executionContext?: { waitUntil(promise: Promise<unknown>): void },
  ): Promise<Response> {
    const cached = await readPublicHtmlCache(request);
    if (cached) return cached;

    const rendered = await paraglideMiddleware(request, () =>
      handler.fetch(request),
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
