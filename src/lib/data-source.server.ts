/**
 * Server-side dual data-source helpers — env + request cookie + session
 * and grant cookie codecs. Import only from server code (server functions,
 * middleware, board.ts). The browser-safe preference cookie helpers live in
 * `data-source.ts`.
 */

import {
  getRequestHeader,
  setResponseHeader,
} from '@tanstack/react-start/server';

import { createDataSourceRuntime } from './data-source-runtime';
import { getServerEnv } from './env';

const runtime = createDataSourceRuntime({
  getServerEnv,
  getRequestHeader,
  setResponseHeader,
});

/** True when the builder (or operator) injected a demo tenant key. */
export const isDemoBoardConfigured = runtime.isDemoBoardConfigured;

/**
 * True when the demo tenant is a private per-board shadow
 * (`CAVUNO_DEMO_BOARD_PRIVATE=1`). Shared public fixtures hide reseed +
 * board-settings toggles to avoid contention.
 */
export const isDemoBoardPrivate = runtime.isDemoBoardPrivate;

/**
 * Server-side helper: read the request cookie and resolve the active source.
 * Returns `board` when no demo key is configured, regardless of cookie value.
 */
export const getDataSource = runtime.getDataSource;

/**
 * Session-cookie scope for a data source. Primary stays unscoped so the
 * legacy `__Host-cavuno_board_session` name is unchanged when dual-source is
 * off (and when on, primary still uses that stable name). Demo sessions are
 * board-scoped via the SDK multi-board codec so a demo token never lands in
 * the primary cookie.
 */
export const sessionCookieOptionsFor = runtime.sessionCookieOptionsFor;

/**
 * Which session cookie persona switch / preview auth writes. Always `demo`
 * when a demo key is configured (personas live on the demo tenant); otherwise
 * `board` (legacy sandbox-on-primary).
 */
export const previewSessionSource = runtime.previewSessionSource;
export const serializeSessionForSource = runtime.serializeSessionForSource;
export const parseSessionForSource = runtime.parseSessionForSource;
export const clearSessionForSource = runtime.clearSessionForSource;

// ── Board-password grant cookies (same per-source scope as sessions) ────────

export const serializeGrantForSource = runtime.serializeGrantForSource;
export const parseGrantForSource = runtime.parseGrantForSource;
export const clearGrantForSource = runtime.clearGrantForSource;

/**
 * Persist a returned bearer pair into the ACTIVE data source's cookie — never
 * clobbering the other source's session when dual-source is on.
 *
 * It lives here, beside the codecs it uses, rather than in `server/auth.ts`.
 * As a plain export there it kept this module alive in the CLIENT graph: the
 * server-fn splitter strips `createServerFn` handler bodies, but not a plain
 * function, so import-protection failed the build. Every caller uses it inside
 * a handler, so the import is stripped and the client stays clean.
 */
export const persistAuthSession = runtime.persistAuthSession;
