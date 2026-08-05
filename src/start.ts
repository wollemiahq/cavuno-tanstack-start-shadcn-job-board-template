/**
 * TanStack Start instance: global middleware for every server fn.
 *
 * CSRF: when no start instance exists, Start injects a default CSRF
 * middleware for server fns. Registering an instance REPLACES that
 * default wholesale, so the same protection is re-added here explicitly —
 * removing it would silently expose every RPC to cross-site requests.
 */
import { createCsrfMiddleware, createStart } from '@tanstack/react-start';

import { localeHeaderMiddleware } from './lib/locale-middleware';

const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === 'serverFn',
});

export const startInstance = createStart(() => ({
  requestMiddleware: [csrfMiddleware],
  functionMiddleware: [localeHeaderMiddleware],
}));
