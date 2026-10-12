/**
 * Server-only half of Board API shed handling: the per-request shed record,
 * the 500 → 503 rewrite for pages, and the 503 for server routes. Wired up
 * by the middlewares in `board-api-shed.ts`; import only from server code.
 */
import { isBoardApiError, type BoardApiError } from '@cavuno/board';
import { transferResponseBodyOwnership } from '@tanstack/react-start/server';

/**
 * Board API statuses that mean "shed / overloaded / briefly unreachable,
 * retry later": 429 and 503 are load shedding; 502 and 504 are the API's
 * proxy failing to reach a backend that is restarting or down.
 */
const SHED_STATUSES = new Set([429, 502, 503, 504]);

/**
 * Seconds a client should wait before retrying a shed page. The SDK error
 * does not carry the upstream `Retry-After` header, so this is a fixed value.
 */
export const SHED_RETRY_AFTER_SECONDS = 60;

/** Incoming requests during which a Board API read was shed. */
const shedRequests = new WeakSet<Request>();

/** `Retry-After` so clients come back, `no-store` so no cache keeps the 503. */
function withShedHeaders(headers: Headers): Headers {
  headers.set('Retry-After', String(SHED_RETRY_AFTER_SECONDS));
  headers.set('Cache-Control', 'no-store');
  return headers;
}

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
  const headers = withShedHeaders(new Headers(response.headers));
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

/**
 * The `503` a server route (sitemap, feed, robots.txt, OG card, ...) answers
 * when its Board API read was shed. Server routes have no rendered error
 * page, so the body is a short plain-text status line.
 */
export function boardApiShedResponse(): Response {
  return new Response('Service Unavailable', {
    status: 503,
    statusText: 'Service Unavailable',
    headers: withShedHeaders(
      new Headers({ 'Content-Type': 'text/plain; charset=utf-8' }),
    ),
  });
}

/**
 * For server routes that catch Board API errors themselves (to answer 404
 * or a bare 503): rethrow a shed so the request middleware answers it with
 * `boardApiShedResponse()`. Any other error is left to the caller.
 */
export function rethrowBoardApiShed<T>(error: T): void {
  if (isBoardApiShed(error)) throw error;
}

/**
 * The request middleware's work for one page or server-route request: run
 * it, answer a thrown shed (a server route's SDK read) with
 * `boardApiShedResponse()`, and rewrite a shed page render's 500 with
 * `shedAwareResponse`. Any other thrown error is rethrown unchanged.
 */
export async function serveShedAware<Result extends { response: Response }>(
  next: () => Result | Promise<Result>,
  request: Request,
): Promise<Result | Response> {
  let result: Result;
  try {
    result = await next();
  } catch (error) {
    if (isBoardApiShed(error)) return boardApiShedResponse();
    throw error;
  }
  return { ...result, response: shedAwareResponse(result.response, request) };
}
