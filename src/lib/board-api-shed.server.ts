/**
 * Server-only half of Board API shed handling: the per-request shed record
 * and the 500 → 503 rewrite. Wired up by the middlewares in
 * `board-api-shed.ts`; import only from server code.
 */
import { isBoardApiError, type BoardApiError } from '@cavuno/board';
import { transferResponseBodyOwnership } from '@tanstack/react-start/server';

/** Board API statuses that mean "shed / overloaded, retry later". */
const SHED_STATUSES = new Set([429, 503]);

/**
 * Seconds a client should wait before retrying a shed page. The SDK error
 * does not carry the upstream `Retry-After` header, so this is a fixed value.
 */
export const SHED_RETRY_AFTER_SECONDS = 60;

/** Incoming requests during which a Board API read was shed. */
const shedRequests = new WeakSet<Request>();

/** True when `error` is the Board API shedding or overloaded. */
export function isBoardApiShed<T>(error: T): error is T & BoardApiError {
  return isBoardApiError(error) && SHED_STATUSES.has(error.status);
}

/** Record `request` as shed when `error` is a Board API shed. */
export function noteBoardApiShed<T>(error: T, request: Request): void {
  if (isBoardApiShed(error)) shedRequests.add(request);
}

/**
 * The response to send for `request`: a `500` render becomes `503` with
 * `Retry-After` when a Board API read was shed during it; anything else is
 * returned as is. The body (the rendered error page) and headers are kept.
 */
export function shedAwareResponse(
  response: Response,
  request: Request,
): Response {
  if (response.status !== 500 || !shedRequests.has(request)) return response;
  const headers = new Headers(response.headers);
  headers.set('Retry-After', String(SHED_RETRY_AFTER_SECONDS));
  headers.set('Cache-Control', 'no-store');
  const rewritten = new Response(response.body, {
    status: 503,
    statusText: 'Service Unavailable',
    headers,
  });
  // Same body stream: tell Start the new Response owns the SSR stream so it
  // still disposes it correctly.
  return response.body
    ? transferResponseBodyOwnership(response, rewritten)
    : rewritten;
}
