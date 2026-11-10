/**
 * Catch-all splat — hosted-parity for the board's `[...rest]` route. Resolves
 * the board's configured redirects (board.redirects.resolve) and 308s to the
 * target; a URL in a language the board turned off 308s to the same page in
 * the board's language; else 404s. Lowest-priority route: only matches a path
 * no other route claims (the hosted catch-all behaves the same).
 */
import { createFileRoute } from '@tanstack/react-router';

import { resolveDisabledLocaleRedirect } from '../server/disabled-locale';
import { resolveRedirect } from '../server/queries';
import { createCatchAllLoader } from './-catch-all-loader';

export const Route = createFileRoute('/$')({
  loader: createCatchAllLoader(resolveRedirect, resolveDisabledLocaleRedirect),
  component: () => null,
});
