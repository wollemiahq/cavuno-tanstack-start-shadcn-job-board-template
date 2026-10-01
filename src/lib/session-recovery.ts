/**
 * Revoked-session recovery at the Board API client seam.
 *
 * The session middleware only judges a session by its LOCAL expiry, so a
 * session the API has revoked (password change, account deletion,
 * server-side logout, sandbox reseed) looks valid for up to an hour. Every
 * server function then sends the dead bearer — public content reads too — and
 * gets a 401, which used to throw every page into the error boundary while the
 * httpOnly cookie stayed put.
 *
 * Recovery lives on the client's `fetch`, the one pipeline every SDK call goes
 * through, rather than in function middleware: TanStack Start's `next()` runs
 * the downstream middleware/handler queue exactly once (a second call finds the
 * queue drained and never re-runs the handler), and handlers that turn errors
 * into typed results never let a 401 reach a middleware at all.
 *
 * When a call carrying THIS data source's cookie session is rejected
 * ({@link isSessionRejection}):
 *  1. one rotation through the source's refresher, which collapses
 *     refreshes of one token per request (see `collapseRefreshesPerRequest`),
 *     so this shares a slot with the session middleware's expiring-soon path;
 *  2. success → persist the new pair, retry the call once with the new bearer;
 *     failure → clear the source's cookie, retry the call once with no bearer;
 *  3. the outcome is memoised per request + source + token, so later or
 *     concurrent calls in the same request reuse it and skip the doomed
 *     round-trip. Nothing is shared across requests.
 *
 * Calls without a bearer, with a bearer that is not the cookie session, or
 * failing for any other reason are untouched. The happy path adds no IO.
 */
import { createRequestMemo } from './request-memo';
import { decideRejectedSession } from './session-decision';
import { isSessionRejection } from './session-rejection';

import type { DataSource } from './data-source';
import type { SessionRefresh } from './session-decision';
import type { FetchOptions } from '@cavuno/board';
import type { BoardSession } from '@cavuno/board/server';

/** `BoardClient.fetch` — the request pipeline every SDK method uses. */
export type BoardFetch = <T>(path: string, init?: FetchOptions) => Promise<T>;

export interface SessionRecoveryDependencies {
  /** The incoming request (memo scope); `null` outside a request. */
  getRequestScope: () => Request | null;
  /** The session in this source's cookie on the incoming request. */
  readSession: (source: DataSource) => BoardSession | null;
  /** This source's refresher (collapses one token's refreshes per request). */
  refresherFor: (source: DataSource) => SessionRefresh;
  serializeSession: (session: BoardSession, source: DataSource) => string;
  clearSession: (source: DataSource) => string;
  /** Write a `Set-Cookie` value on the response (same as the rotate path). */
  setCookie: (value: string) => void;
}

/** The replacement session for a rejected token; `null` = signed out. */
type Recovery = Promise<BoardSession | null>;

const BEARER = /^Bearer\s+(.+)$/i;

function bearerToken(init: FetchOptions | undefined): string | null {
  if (!init?.headers) return null;
  const value = new Headers(init.headers).get('authorization');
  return value ? (BEARER.exec(value)?.[1] ?? null) : null;
}

function withSession(
  init: FetchOptions | undefined,
  session: BoardSession | null,
): FetchOptions {
  const headers = new Headers(init?.headers);
  if (session) headers.set('authorization', `Bearer ${session.accessToken}`);
  else headers.delete('authorization');
  return { ...init, headers: Object.fromEntries(headers) };
}

export function createSessionRecovery(deps: SessionRecoveryDependencies) {
  const recoveries = createRequestMemo<Recovery>();

  function keyFor(source: DataSource, token: string): string {
    return `${source}\u0000${token}`;
  }

  /** This request's recovery outcome for a source's token, if one ran. */
  function outcomeFor(source: DataSource, token: string): Recovery | undefined {
    const scope = deps.getRequestScope();
    return scope ? recoveries.get(scope, keyFor(source, token)) : undefined;
  }

  /** The memoised recovery for `token`, starting one only if it is the cookie session. */
  function recover(
    scope: Request,
    source: DataSource,
    token: string,
  ): Recovery | null {
    const key = keyFor(source, token);
    const existing = recoveries.get(scope, key);
    if (existing) return existing;

    const session = deps.readSession(source);
    if (!session || session.accessToken !== token) return null;

    return recoveries.getOrCreate(scope, key, () =>
      decideRejectedSession(session, deps.refresherFor(source)).then(
        ({ session: next, setCookie }) => {
          deps.setCookie(
            setCookie === 'rotate' && next
              ? deps.serializeSession(next, source)
              : deps.clearSession(source),
          );
          return next;
        },
      ),
    );
  }

  function wrapFetch(fetch: BoardFetch, source: DataSource): BoardFetch {
    return async function recoveringFetch<T>(
      path: string,
      init?: FetchOptions,
    ): Promise<T> {
      const token = bearerToken(init);
      if (!token) return fetch<T>(path, init);

      const scope = deps.getRequestScope();
      const known = scope
        ? recoveries.get(scope, keyFor(source, token))
        : undefined;
      if (known) return fetch<T>(path, withSession(init, await known));

      try {
        return await fetch<T>(path, init);
      } catch (error) {
        if (!scope || !isSessionRejection(error)) throw error;
        // A stream body was consumed by the first attempt; it cannot be resent.
        if (init?.body instanceof ReadableStream) throw error;
        const recovery = recover(scope, source, token);
        if (!recovery) throw error;
        return fetch<T>(path, withSession(init, await recovery));
      }
    };
  }

  return { outcomeFor, wrapFetch };
}
