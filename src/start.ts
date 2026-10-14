/**
 * TanStack Start instance: global middleware for every server fn.
 *
 * CSRF: when no start instance exists, Start injects a default CSRF
 * middleware for server fns. Registering an instance REPLACES that
 * default wholesale, so the same protection is re-added here explicitly —
 * removing it would silently expose every RPC to cross-site requests.
 *
 * Board API shedding: a page whose loaders, or a server route (sitemap,
 * feed, robots.txt, OG card, ...) whose handler, hit a Board API shed
 * answers 503 + Retry-After instead of 500 (see src/lib/board-api-shed.ts).
 *
 * Server errors: the first error a server fn throws during a request is
 * noted, so the server entry can log it if Start answers that request with
 * a 500 (see src/lib/server-error-log.server.ts).
 *
 * Serialization: a `BoardApiError` thrown by a server fn reaches the client
 * as a `BoardApiError`, so loaders' `isNotFound(error)` holds after a
 * client-side navigation too (see src/lib/board-api-error-serialization.ts).
 */
import { createCsrfMiddleware, createStart } from '@tanstack/react-start';

import { boardApiErrorAdapter } from './lib/board-api-error-serialization';
import {
  boardApiShedFunctionMiddleware,
  boardApiShedRequestMiddleware,
} from './lib/board-api-shed';
import { localeHeaderMiddleware } from './lib/locale-middleware';
import { serverErrorFunctionMiddleware } from './lib/server-error-log';

const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === 'serverFn',
});

export const startInstance = createStart(() => ({
  requestMiddleware: [csrfMiddleware, boardApiShedRequestMiddleware],
  functionMiddleware: [
    localeHeaderMiddleware,
    boardApiShedFunctionMiddleware,
    serverErrorFunctionMiddleware,
  ],
  serializationAdapters: [boardApiErrorAdapter],
}));
