import { createFileRoute } from '@tanstack/react-router';

import { impressumAvailable } from '../content/legal/impressum-availability';
import { readBoardContext } from '../lib/board-context-cache';
import { createWellKnownRouteHandler } from './-well-known-handler';

/**
 * `/.well-known/cavuno.json` route-contract manifest. Serves the compiled
 * ManifestV1 so the platform (and digests/emails) can resolve board path
 * roles against this app's actual route tree.
 *
 * Routes are enumerated from the generated TanStack route tree via the
 * SDK's structural walker and classified on that canonical tree; each
 * role's template is then published in the board language's URL words
 * (src/url-words.json), the URLs the board serves. Route files may name
 * their role with `export const cavunoPage = '<role>'` (the profile page
 * does); the platform reads those markers from the source files, not from
 * this response.
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
  async () => impressumAvailable((await readBoardContext()).features),
);

export const Route = createFileRoute('/.well-known/cavuno.json')({
  server: {
    handlers: {
      GET: ({ request }) => wellKnownHandler(request),
    },
  },
});
