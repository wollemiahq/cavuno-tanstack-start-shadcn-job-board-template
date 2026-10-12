import { isBoardApiError } from '@cavuno/board';
import { notFound, redirect } from '@tanstack/react-router';

import { resolveRedirect } from '../server/queries';

/**
 * The catch-all splat's loader: 308 to the board's configured redirect for
 * the path, else 404.
 *
 * A client error from the redirect lookup also 404s. The lookup sends the
 * visitor's path as a query string, and scanner paths like `/.env` or
 * `/.git/config` can be refused before they reach the Board API (an edge
 * firewall answers 403). Those paths are not pages either way; letting the
 * refusal escape rendered a 500 for every probe. A server error or network
 * failure still rejects, so a real outage is not reported as a missing page.
 * Thrown TanStack redirects (the password wall) are not Board API errors and
 * pass through untouched.
 */
export function createCatchAllLoader(resolve: typeof resolveRedirect) {
  return async ({ params }: { params: { _splat?: string } }) => {
    const path = `/${params._splat ?? ''}`;
    let target: string | null;
    try {
      ({ target } = await resolve({ data: { path } }));
    } catch (error) {
      if (isBoardApiError(error) && error.status >= 400 && error.status < 500) {
        throw notFound();
      }
      throw error;
    }
    if (target) {
      // 308 permanent — matches the hosted `permanentRedirect(target)`.
      throw redirect({ href: target, statusCode: 308 });
    }
    throw notFound();
  };
}
