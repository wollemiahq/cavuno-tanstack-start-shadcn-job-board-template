import { isBoardApiError } from '@cavuno/board';
import { notFound, redirect } from '@tanstack/react-router';

import type { resolveRedirect } from '../server/queries';

/**
 * The catch-all splat's loader: 308 to the board's configured redirect for
 * the path, else 404.
 *
 * A refused lookup (403) also 404s. The lookup sends the visitor's path as a
 * query string, and scanner paths like `/.env` or `/.git/config` are refused
 * by the edge firewall in front of the Board API. Those paths are not pages
 * either way; letting the refusal escape rendered a 500 for every probe. Any
 * other failure still rejects: a rate limit (429) or an outage must not turn
 * a real redirect into a 404, and a misconfigured key must stay visible.
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
      if (isBoardApiError(error) && error.status === 403) {
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
