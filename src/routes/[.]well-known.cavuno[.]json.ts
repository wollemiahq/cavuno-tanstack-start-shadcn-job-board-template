import { createFileRoute } from '@tanstack/react-router';

import { routeTree } from '../routeTree.gen';
import { createWellKnownRouteHandler } from './-well-known-handler';

/**
 * `/.well-known/cavuno.json` route-contract manifest. Serves the compiled
 * ManifestV1 so the platform (and digests/emails) can resolve board path
 * roles against this app's actual route tree.
 *
 * Routes are enumerated from the generated TanStack route tree via the
 * SDK's structural walker. No cavunoPage markers exist in this app yet.
 *
 * The static import of `routeTree.gen.ts` (which imports every route,
 * including this one) is an intentional module cycle: nothing here touches
 * the binding at evaluation time — it is only read inside the deferred
 * request handler, by which point the tree module is fully initialized.
 */
import type { TanStackRouteNode } from '@cavuno/board/well-known';

// SAFETY: TanStack's generated route tree satisfies the SDK's structural
// route-node contract; the assertion bridges their independently named types.
const wellKnownHandler = createWellKnownRouteHandler(
  () => routeTree as TanStackRouteNode,
);

export const Route = createFileRoute('/.well-known/cavuno.json')({
  server: {
    handlers: {
      GET: ({ request }) => wellKnownHandler(request),
    },
  },
});
