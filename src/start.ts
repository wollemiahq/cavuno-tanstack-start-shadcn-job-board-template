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

const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === 'serverFn',
});

export const startInstance = createStart(() => ({
  requestMiddleware: [csrfMiddleware, boardApiShedRequestMiddleware],
  functionMiddleware: [localeHeaderMiddleware, boardApiShedFunctionMiddleware],
  serializationAdapters: [boardApiErrorAdapter],
}));
