/**
 * `/.well-known/cavuno.json` — LNK-08 route-contract manifest. Serves the
 * compiled ManifestV1 so the platform (and digests/emails) can resolve
 * board path roles against this app's actual route tree.
 *
 * Routes are enumerated from the generated TanStack route tree via the
 * SDK's structural walker. No cavunoPage markers exist in this app yet.
 *
 * routeTree is loaded lazily inside the request path so this route module
 * does not form a static circular import with `routeTree.gen.ts` (which
 * imports every route, including this one).
 */
import {
  createWellKnownHandler,
  routeEntriesFromTanStackRouteTree,
  type TanStackRouteNode,
} from '@cavuno/board/well-known';
import { createFileRoute } from '@tanstack/react-router';

const wellKnownHandler = createWellKnownHandler({
  routes: async () => {
    const { routeTree } = await import('../routeTree.gen');
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
