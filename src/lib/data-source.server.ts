/**
 * Server-side dual data-source helpers — env + request cookie + session
 * and grant cookie codecs. Import only from server code (server functions,
 * middleware, board.ts). The browser-safe preference cookie helpers live in
 * `data-source.ts`.
 */

import { type BoardAuthSession } from '@cavuno/board';
import {
  clearGrantCookie,
  clearSessionCookie,
  parseGrantCookie,
  parseSessionCookie,
  serializeGrantCookie,
  serializeSessionCookie,
  type BoardSession,
} from '@cavuno/board/server';
import {
  getRequestHeader,
  setResponseHeader,
} from '@tanstack/react-start/server';

import { resolveDataSource, type DataSource } from './data-source';
import { getServerEnv } from './env';

/** True when the builder (or operator) injected a demo tenant key. */
export function isDemoBoardConfigured(): boolean {
  return typeof getServerEnv().demoBoard === 'string';
}

/**
 * True when the demo tenant is a private per-board shadow
 * (`CAVUNO_DEMO_BOARD_PRIVATE=1`). Shared public fixtures hide reseed +
 * board-settings toggles to avoid contention.
 */
export function isDemoBoardPrivate(): boolean {
  return getServerEnv().demoBoardPrivate === true;
}

/**
 * Server-side helper: read the request cookie and resolve the active source.
 * Returns `board` when no demo key is configured, regardless of cookie value.
 */
export function getDataSource(): DataSource {
  return resolveDataSource(
    getRequestHeader('cookie') ?? null,
    isDemoBoardConfigured(),
  );
}

/**
 * Session-cookie scope for a data source. Primary stays unscoped so the
 * legacy `__Host-cavuno_board_session` name is unchanged when dual-source is
 * off (and when on, primary still uses that stable name). Demo sessions are
 * board-scoped via the SDK multi-board codec so a demo token never lands in
 * the primary cookie.
 */
export function sessionCookieOptionsFor(source: DataSource): {
  board?: string;
} {
  if (source === 'demo') {
    const demoBoard = getServerEnv().demoBoard;
    if (demoBoard) return { board: demoBoard };
  }
  return {};
}

/**
 * Which session cookie persona switch / preview auth writes. Always `demo`
 * when a demo key is configured (personas live on the demo tenant); otherwise
 * `board` (legacy sandbox-on-primary).
 */
export function previewSessionSource(): DataSource {
  return isDemoBoardConfigured() ? 'demo' : 'board';
}

export function serializeSessionForSource(
  session: BoardSession,
  source: DataSource,
): string {
  return serializeSessionCookie(session, sessionCookieOptionsFor(source));
}

export function parseSessionForSource(
  cookieHeader: string | null,
  source: DataSource,
): BoardSession | null {
  return parseSessionCookie(cookieHeader, sessionCookieOptionsFor(source));
}

export function clearSessionForSource(source: DataSource): string {
  return clearSessionCookie(sessionCookieOptionsFor(source));
}

// ── Board-password grant cookies (same per-source scope as sessions) ────────

export function serializeGrantForSource(
  token: string,
  source: DataSource,
): string {
  return serializeGrantCookie(token, sessionCookieOptionsFor(source));
}

export function parseGrantForSource(
  cookieHeader: string | null,
  source: DataSource,
): string | null {
  return parseGrantCookie(cookieHeader, sessionCookieOptionsFor(source));
}

export function clearGrantForSource(source: DataSource): string {
  return clearGrantCookie(sessionCookieOptionsFor(source));
}

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
export function persistAuthSession(session: BoardAuthSession): BoardSession {
  const next: BoardSession = {
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    expiresAt: session.expiresAt,
  };
  setResponseHeader(
    'Set-Cookie',
    serializeSessionForSource(next, getDataSource()),
  );
  return next;
}
