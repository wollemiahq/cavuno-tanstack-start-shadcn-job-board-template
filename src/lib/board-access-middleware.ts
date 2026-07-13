/**
 * Board-access middleware: reads the host-owned grant cookie and exposes it as
 * a per-call `X-Board-Access` header for gated SDK reads. Mirrors the session
 * middleware's per-request, per-call-header pattern (ADR-0006) — the grant
 * never lives on the module-scoped SDK instance, so SSR stays stateless.
 */
import { createMiddleware } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'

import { currentPathFromReferer, parseGrantCookie } from '@cavuno/board/server'

export interface BoardAccessContext {
  /** `{ 'x-board-access': grant }` when a grant cookie is present, else `{}`. */
  boardAccessHeaders: Record<string, string>
  /** Current page path (from the RPC Referer) for the /password redirect-back. */
  currentPath: string
}

export const boardAccessMiddleware = createMiddleware({
  type: 'function',
}).server(async ({ next }) => {
  const grant = parseGrantCookie(getRequestHeader('cookie') ?? null)
  const context: BoardAccessContext = {
    boardAccessHeaders: grant ? { 'x-board-access': grant } : {},
    currentPath: currentPathFromReferer(getRequestHeader('referer') ?? null),
  }
  return next({ context })
})
