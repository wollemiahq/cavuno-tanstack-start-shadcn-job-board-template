/**
 * Catch-all splat — hosted-parity for the board's `[...rest]` route. Resolves
 * the board's configured redirects (board.redirects.resolve) and 308s to the
 * target, else 404s. Lowest-priority route: only matches a path no other route
 * claims (the hosted catch-all behaves the same).
 */
import { createFileRoute } from '@tanstack/react-router';

import { resolveRedirect } from '../server/queries';
import { createCatchAllLoader } from './-catch-all-loader';

export const Route = createFileRoute('/$')({
  loader: createCatchAllLoader(resolveRedirect),
  component: () => null,
});
