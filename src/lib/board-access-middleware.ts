import { currentPathFromReferer } from '@cavuno/board/server';
/**
 * Board-access middleware: composes the per-call headers for gated SDK
 * content reads. Mirrors the session middleware's per-request,
 * per-call-header pattern — nothing lives on the module-scoped
 * SDK instance, so SSR stays stateless. Two headers ride along:
 *
 *  - `X-Board-Access` — the host-owned board-password grant cookie for
 *    the **active data source** (dual-source: scoped like the session cookie
 *    so a demo-tenant grant is never sent on a real-tenant request).
 *  - `Authorization: Bearer …` — the signed-in board user's session (via
 *    the session middleware, so refresh-on-expiry is shared). Content
 *    reads must carry the viewer's identity or the API serves the
 *    anonymous view — e.g. a candidate with an active paywall grant would
 *    still get the capped public job list. Anonymous requests stay
 *    header-free and get the shared-cacheable public view.
 */
import { createMiddleware } from '@tanstack/react-start';
import { getRequestHeader } from '@tanstack/react-start/server';

import { getDataSource, parseGrantForSource } from './data-source.server';
import { sessionMiddleware } from './session-middleware';

export interface BoardAccessContext {
  /** Grant + bearer headers for one gated content read; `{}` when anonymous. */
  boardAccessHeaders: Record<string, string>;
  /** Current page path (from the RPC Referer) for the /password redirect-back. */
  currentPath: string;
}

export const boardAccessMiddleware = createMiddleware({
  type: 'function',
})
  .middleware([sessionMiddleware])
  .server(async ({ next, context }) => {
    const dataSource = getDataSource();
    const grant = parseGrantForSource(
      getRequestHeader('cookie') ?? null,
      dataSource,
    );
    const boardAccessContext: BoardAccessContext = {
      boardAccessHeaders: grant
        ? { 'x-board-access': grant, ...context.authHeaders }
        : context.authHeaders,
      currentPath: currentPathFromReferer(getRequestHeader('referer') ?? null),
    };
    return next({ context: boardAccessContext });
  });
