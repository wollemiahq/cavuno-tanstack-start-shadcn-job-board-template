/**
 * Per-request locale for server-fn RPCs.
 *
 * RPC URLs (/_serverFn/*) carry no /de/ prefix, so the server can't read
 * the viewer's locale from the URL the way it does for documents. The
 * client leg of this middleware attaches the tab's own resolved locale as
 * a request header; the server entry (src/server.ts) feeds it to Paraglide
 * detection. A header — unlike a cookie — is per-tab and per-request: two
 * tabs open in different locales each get responses in their own language,
 * and nothing locale-shaped persists in the browser.
 *
 * The client leg only runs for client→server fetches. During SSR, server
 * fns are invoked in-process inside the document request's Paraglide
 * scope, which already carries the URL-resolved locale.
 */
import { createMiddleware } from '@tanstack/react-start';

import { getLocale } from '../paraglide/runtime';

export const LOCALE_HEADER = 'x-paraglide-locale';

export const localeHeaderMiddleware = createMiddleware({
  type: 'function',
}).client(({ next }) => next({ headers: { [LOCALE_HEADER]: getLocale() } }));
