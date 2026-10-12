/**
 * Board API load shedding → `503 Service Unavailable` for the page.
 *
 * Under load the Board API sheds overflow traffic with `429` (and can answer
 * `503` when overloaded, `502`/`504` while a backend restarts). Those are "come back later", not bugs, yet a
 * loader that rethrows one renders the page as a `500`. Crawlers treat a 500
 * as a broken page; a 503 with `Retry-After` tells them to back off and
 * return.
 *
 * Two halves, because the `BoardApiError` does not survive the server-fn
 * RPC boundary and the router picks the page status (500 for any loader
 * error) after every server fn has returned:
 *
 *  1. `boardApiShedFunctionMiddleware` (global, every server fn) sees the
 *     structured error server-side, before it is serialised, and records
 *     that THIS incoming request was shed. Nothing about the error changes.
 *  2. `boardApiShedRequestMiddleware` (global, every request) rewrites a
 *     page render that came out `500` into `503` + `Retry-After` when step 1
 *     recorded a shed for the same request. Any other 500 stays a 500, and
 *     a page that degraded gracefully around a shed read (200) is untouched.
 *
 * No retry and no timeout: the shed is surfaced, not hidden.
 */
import { createMiddleware } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';

import { noteBoardApiShed, shedAwareResponse } from './board-api-shed.server';

/** Step 1: record a shed from any server fn, server-side, then rethrow. */
export const boardApiShedFunctionMiddleware = createMiddleware({
  type: 'function',
}).server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    noteBoardApiShed(error, getRequest());
    throw error;
  }
});

/** Step 2: turn a shed page render's 500 into 503 + Retry-After. */
export const boardApiShedRequestMiddleware = createMiddleware().server(
  async ({ next, handlerType }) => {
    const result = await next();
    // Server-fn RPC responses keep their own status contract with the client.
    if (handlerType !== 'router') return result;
    return {
      ...result,
      response: shedAwareResponse(result.response, getRequest()),
    };
  },
);
