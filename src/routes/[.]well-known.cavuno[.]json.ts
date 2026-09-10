import { createFileRoute } from '@tanstack/react-router';

import { readBoardContext } from '../lib/board-context-cache';
import { createWellKnownRouteHandler } from './-well-known-handler';

/**
 * `/.well-known/cavuno.json` route-contract manifest. Serves the compiled
 * ManifestV1 so the platform (and digests/emails) can resolve board path
 * roles against this app's actual route tree.
 *
 * Routes are enumerated from the generated TanStack route tree via the
 * SDK's structural walker. No cavunoPage markers exist in this app yet.
 *
 * Load the generated tree only inside the request handler. Importing it at
 * module scope creates a cycle through this route; concurrent dev-server
 * reloads can then observe this route before its export is initialized.
 */
import type { TanStackRouteNode } from '@cavuno/board/well-known';

// SAFETY: TanStack's generated route tree satisfies the SDK's structural
// route-node contract; the assertion bridges their independently named types.
const wellKnownHandler = createWellKnownRouteHandler(
  async () => (await import('../routeTree.gen')).routeTree as TanStackRouteNode,
  async () => (await readBoardContext()).features.impressum,
);

export const Route = createFileRoute('/.well-known/cavuno.json')({
  server: {
    handlers: {
      GET: ({ request }) => wellKnownHandler(request),
    },
  },
});
