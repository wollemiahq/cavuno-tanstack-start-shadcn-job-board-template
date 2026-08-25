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
 * created singleton (and its own single-flight session refresher) serves
 * the demo tenant. `getActiveBoard()` selects by the data-source cookie;
 * `getPreviewBoard()` always prefers the demo client when configured
 * (personas live on the demo tenant). `getBoard()` is an alias of
 * `getActiveBoard()` so every existing data-fetch call site respects the
 * cookie without a mass rename — when the demo key is absent the alias is
 * byte-identical to the pre-dual-source primary-only client.
 */
import { createBoardClient, type BoardSdk } from '@cavuno/board';
import { createSessionRefresher } from '@cavuno/board/server';

import { createBoardClientRegistry } from './board-client-registry';
import { getDataSource } from './data-source.server';
import { getServerEnv } from './env';
import { applyReadCache } from './read-cache';
import {
  coordinateSessionRefresh,
  type CoordinatedSessionRefresher,
} from './session-refresh-coordinator';

import type { DataSource } from './data-source';

const APPLY_GATEWAY_CAPABILITY_HEADER = 'x-cavuno-board-capabilities';
const APPLY_GATEWAY_CAPABILITY = 'apply-gateway-v1';

const registry = createBoardClientRegistry({
  createClient: createBoardClient,
  createRefresher: (client) =>
    coordinateSessionRefresh(createSessionRefresher(client)),
  getDataSource,
  getServerEnv,
  onRequest: applyReadCache,
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
 * The shared single-flight session refresher per data source (one instance
 * for the whole server per source — per-request construction would defeat
 * the single-flight slot that keeps concurrent requests from burning the
 * single-use refresh token).
 */
export function getPrimarySessionRefresher(): CoordinatedSessionRefresher {
  return registry.getPrimarySessionRefresher();
}

export function getDemoSessionRefresher(): CoordinatedSessionRefresher {
  return registry.getDemoSessionRefresher();
}

export function getActiveSessionRefresher(): CoordinatedSessionRefresher {
  return registry.getActiveSessionRefresher();
}

/**
 * Session refresher for the active data source (alias so existing middleware
 * keeps working and automatically scopes refresh to the right tenant).
 */
export function getSessionRefresher(): CoordinatedSessionRefresher {
  return getActiveSessionRefresher();
}

/** Session refresher matching a concrete data source. */
export function getSessionRefresherFor(
  source: DataSource,
): CoordinatedSessionRefresher {
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
