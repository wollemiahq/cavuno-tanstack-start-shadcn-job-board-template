/**
 * The shared `@cavuno/board` client.
 *
 * One module-scoped, stateless instance serves every request: the
 * server default storage is `nostore`, so NO token ever lives on the
 * instance — authenticated calls pass `{ headers: { authorization } }`
 * per call from the session middleware (ADR-0006 SSR pattern; the
 * Medusa-starter architecture the SDK was designed for).
 */
import { createBoardClient, type BoardSdk } from '@cavuno/board'
import { createSessionRefresher } from '@cavuno/board/server'

import { getServerEnv } from './env'

let client: BoardSdk | null = null

export function getBoard(): BoardSdk {
  if (!client) {
    const { apiUrl, board } = getServerEnv()
    client = createBoardClient({ baseUrl: apiUrl, board })
  }
  return client
}

/**
 * The shared single-flight session refresher (one instance for the whole
 * server, like the client above — per-request construction would defeat the
 * single-flight slot that keeps concurrent requests from burning the
 * single-use refresh token).
 */
let refresher: ReturnType<typeof createSessionRefresher> | null = null

export function getSessionRefresher(): ReturnType<typeof createSessionRefresher> {
  if (!refresher) {
    refresher = createSessionRefresher(getBoard())
  }
  return refresher
}

/** Bearer headers for one authenticated call. */
export function authHeaders(accessToken: string): Record<string, string> {
  return { authorization: `Bearer ${accessToken}` }
}
