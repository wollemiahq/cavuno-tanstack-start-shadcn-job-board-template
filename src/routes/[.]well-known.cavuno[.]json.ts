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
import {
  createWellKnownHandler,
  routeEntriesFromTanStackRouteTree,
  type TanStackRouteNode,
} from '@cavuno/board/well-known';
import { createFileRoute } from '@tanstack/react-router';

import { routeTree } from '../routeTree.gen';

const wellKnownHandler = createWellKnownHandler({
  routes: async () => {
    // routeTree is a live TanStack Route instance; the SDK walker is
    // structural (id/path/fullPath/children) and does not depend on
    // @tanstack types — cast through the documented shape.
    return routeEntriesFromTanStackRouteTree(
      routeTree as unknown as TanStackRouteNode,
    );
  },
});

export const Route = createFileRoute('/.well-known/cavuno.json')({
  server: {
    handlers: {
      GET: ({ request }) => wellKnownHandler(request),
    },
  },
});
