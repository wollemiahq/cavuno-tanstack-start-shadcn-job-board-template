import { isBoardApiError } from '@cavuno/board';
import { notFound, redirect } from '@tanstack/react-router';

import { disabledLocaleOf } from '../lib/disabled-locale';

import type { resolveDisabledLocaleRedirect } from '../server/disabled-locale';
import type { resolveRedirect } from '../server/queries';

/**
 * The catch-all splat's loader, for a path no other route claims:
 *
 * 1. the board's configured redirect for the path, else
 * 2. a disabled locale's URL (`/en/jobs` on a board that turned English
 *    off) goes to the same page in the board's language, else
 * 3. 404.
 *
 * Both redirects are 308s. A configured redirect wins, so an operator can
 * still send a disabled locale's URLs anywhere they like. The locale step
 * is path logic and reads no board data; it runs only for a path that
 * starts with a language the board does not serve.
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
export function createCatchAllLoader(
  resolve: typeof resolveRedirect,
  resolveDisabledLocale: typeof resolveDisabledLocaleRedirect,
) {
  return async ({
    params,
    location,
  }: {
    params: { _splat?: string };
    location: { href: string; searchStr: string };
  }): Promise<never> => {
    const target = await managedRedirectTarget(
      resolve,
      `/${params._splat ?? ''}`,
    );
    if (target) throw managedRedirect(target);
    // The path as requested, still percent-encoded: `location.pathname` is
    // decoded, and a decoded slug is not a valid Location header value.
    const [pathname = '/'] = location.href.split(/[?#]/, 1);
    if (disabledLocaleOf(pathname)) {
      const { target: localized } = await resolveDisabledLocale({
        data: { path: pathname },
      });
      if (localized) {
        throw redirect({
          href: `${localized}${location.searchStr}`,
          statusCode: 308,
          // Bounded like the localized-URL redirect: turning the language
          // back on must not leave returning visitors on a cached hop.
          headers: { 'Cache-Control': 'max-age=86400' },
        });
      }
    }
    throw notFound();
  };
}

/**
 * 308 to the board's configured redirect for `path`, else 404. Shared by
 * routes whose own lookup missed (a retired blog post, a removed company or
 * job, an unknown taxonomy slug), so every managed redirect gets the same
 * refusal and failure handling. Called only on the miss: a page that renders
 * never pays for the lookup.
 */
export async function followManagedRedirect(
  resolve: typeof resolveRedirect,
  path: string,
): Promise<never> {
  const target = await managedRedirectTarget(resolve, path);
  if (target) throw managedRedirect(target);
  throw notFound();
}

/**
 * The path the visitor requested, as they typed it: localized segments and
 * any locale prefix kept (`/bedrijven/acme`), percent-decoded like a route
 * param. A route's own params come from the delocalized path the router
 * matches (`/companies/acme`), but operators write redirect rules against the
 * URLs visitors see, so a route whose lookup missed asks with this.
 */
export function requestedPath(location: { publicHref: string }): string {
  const [pathname = '/'] = location.publicHref.split(/[?#]/, 1);
  try {
    return decodeURI(pathname);
  } catch {
    return pathname;
  }
}

/** The configured redirect target for `path`, or null. A refused lookup
 * throws notFound (see createCatchAllLoader). */
async function managedRedirectTarget(
  resolve: typeof resolveRedirect,
  path: string,
): Promise<string | null> {
  try {
    const { target } = await resolve({ data: { path } });
    return target;
  } catch (error) {
    if (isBoardApiError(error) && error.status === 403) {
      throw notFound();
    }
    throw error;
  }
}

// 308 permanent — matches the hosted `permanentRedirect(target)`.
function managedRedirect(target: string) {
  return redirect({ href: target, statusCode: 308 });
}
