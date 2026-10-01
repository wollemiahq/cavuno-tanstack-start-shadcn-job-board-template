/**
 * The shared `@cavuno/board` client(s).
 *
 * One module-scoped, stateless instance serves every request for a given
 * data source: the server default storage is `nostore`, so NO token ever
 * lives on the instance — authenticated calls pass
 * `{ headers: { authorization } }` per call from the session middleware.
 * This is the SSR pattern the SDK is designed for: one shared, tokenless
 * client, per-request auth.
 *
 * Dual-source (DMO-01): when `CAVUNO_DEMO_BOARD` is set, a second lazily-
 * created singleton (and its own session refresher) serves
 * the demo tenant. `getActiveBoard()` selects by the data-source cookie;
 * `getPreviewBoard()` always prefers the demo client when configured
 * (personas live on the demo tenant). `getBoard()` is an alias of
 * `getActiveBoard()` so every existing data-fetch call site respects the
 * cookie without a mass rename — when the demo key is absent the alias is
 * byte-identical to the pre-dual-source primary-only client.
 */
import {
  createBoardClient,
  type BoardSdk,
  type CreateBoardClientOptions,
} from '@cavuno/board';
import { createSessionRefresher } from '@cavuno/board/server';
import {
  getRequest,
  getRequestHeader,
  setResponseHeader,
} from '@tanstack/react-start/server';

import { applyAudienceAttribution } from './audience-request';
import { createBoardClientRegistry } from './board-client-registry';
import {
  clearSessionForSource,
  getDataSource,
  parseSessionForSource,
  serializeSessionForSource,
} from './data-source.server';
import { getServerEnv } from './env';
import { applyReadCache } from './read-cache';
import { collapseRefreshesPerRequest } from './session-decision';
import { createSessionRecovery } from './session-recovery';

import type { DataSource } from './data-source';

const APPLY_GATEWAY_CAPABILITY_HEADER = 'x-cavuno-board-capabilities';
const APPLY_GATEWAY_CAPABILITY = 'apply-gateway-v1';

/** The incoming request, the scope of per-request memos; `null` outside one. */
function currentRequest(): Request | null {
  try {
    return getRequest();
  } catch {
    return null;
  }
}

/**
 * Revoked-session recovery (see `session-recovery.ts`): a call whose bearer is
 * this source's cookie session and that the API rejects gets one refresh, then
 * one retry with the new bearer or anonymously after the cookie is cleared.
 */
const sessionRecovery = createSessionRecovery({
  getRequestScope: currentRequest,
  readSession: (source) =>
    parseSessionForSource(getRequestHeader('cookie') ?? null, source),
  refresherFor: (source) => getSessionRefresherFor(source),
  serializeSession: serializeSessionForSource,
  clearSession: clearSessionForSource,
  setCookie: (value) => setResponseHeader('Set-Cookie', value),
});

/**
 * This request's recovery outcome for a source's rejected access token:
 * `null` = signed out, a session = rotated, `undefined` = none ran.
 */
export function getSessionRecoveryOutcome(
  source: DataSource,
  accessToken: string,
) {
  return sessionRecovery.outcomeFor(source, accessToken);
}

const registry = createBoardClientRegistry({
  createClient: (options: CreateBoardClientOptions, source) => {
    const board = createBoardClient(options);
    board.client.fetch = sessionRecovery.wrapFetch(
      board.client.fetch.bind(board.client),
      source,
    );
    return board;
  },
  createRefresher: (board) =>
    collapseRefreshesPerRequest(createSessionRefresher(board), currentRequest),
  getDataSource,
  getServerEnv,
  onRequest: (request) =>
    applyReadCache(
      applyAudienceAttribution(
        request,
        () => getRequestHeader('cookie'),
        () => {
          // SAFETY: Workers supplies cf metadata on the incoming request;
          // a local server has no cf property and leaves country unknown.
          const incoming = getRequest() as Request & {
            cf?: { country?: string };
          };
          return incoming.cf?.country;
        },
      ),
    ),
});

/** Advertise the upgraded Apply contract only at its controlled seams. */
export function withApplyGatewayCapability(
  headers: Record<string, string> = {},
) {
  return {
    ...headers,
    [APPLY_GATEWAY_CAPABILITY_HEADER]: APPLY_GATEWAY_CAPABILITY,
  };
}

/** Primary (operator) board client — real tenant data. */
export function getPrimaryBoard(): BoardSdk {
  return registry.getPrimaryBoard();
}

/**
 * Demo-tenant client when `CAVUNO_DEMO_BOARD` is set; otherwise `null` and
 * never constructs a client (T1).
 */
export function getDemoBoard(): BoardSdk | null {
  return registry.getDemoBoard();
}

/**
 * Client for the current request's data source. Cookie `demo` + configured
 * demo key → demo client; otherwise primary.
 */
export function getActiveBoard(): BoardSdk {
  return registry.getActiveBoard();
}

/**
 * Board client for data-fetching call sites. Routes through the active
 * data source so switching the cookie switches all board data. When no
 * demo key is configured this is always the primary client.
 */
export function getBoard(): BoardSdk {
  return getActiveBoard();
}

/**
 * Client persona/preview server functions must use: always the demo
 * tenant when a demo key is configured (sandbox personas live there),
 * else the primary board (legacy sandbox-on-primary).
 */
export function getPreviewBoard(): BoardSdk {
  return registry.getPreviewBoard();
}

/**
 * The session refresher per data source. The SDK refresher holds no shared
 * state and the API converges concurrent refreshes of one token; the wrapper
 * collapses refreshes of one token to a single call per incoming request
 * (never across requests) so one page render spends one refresh against the
 * API's auth rate limit. See `collapseRefreshesPerRequest`.
 */
export function getPrimarySessionRefresher(): ReturnType<
  typeof createSessionRefresher
> {
  return registry.getPrimarySessionRefresher();
}

export function getDemoSessionRefresher(): ReturnType<
  typeof createSessionRefresher
> {
  return registry.getDemoSessionRefresher();
}

export function getActiveSessionRefresher(): ReturnType<
  typeof createSessionRefresher
> {
  return registry.getActiveSessionRefresher();
}

/**
 * Session refresher for the active data source (alias so existing middleware
 * keeps working and automatically scopes refresh to the right tenant).
 */
export function getSessionRefresher(): ReturnType<
  typeof createSessionRefresher
> {
  return getActiveSessionRefresher();
}

/** Session refresher matching a concrete data source. */
export function getSessionRefresherFor(
  source: DataSource,
): ReturnType<typeof createSessionRefresher> {
  return registry.getSessionRefresherFor(source);
}

/** Bearer headers for one authenticated call. */
export function authHeaders(accessToken: string) {
  return { authorization: `Bearer ${accessToken}` };
}

/** Test-only: drop singletons so suite cases can re-construct clients. */
export function __resetBoardClientsForTests(): void {
  registry.reset();
}
