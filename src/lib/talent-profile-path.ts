import { linkOptions } from '@tanstack/react-router';

/**
 * The one place a candidate profile URL is built. Cards, the directory's
 * selection key, header scope, canonical tags, and JSON-LD all go through
 * this module, so moving the profile page is two edits: rename the route
 * file (`p.$handle.tsx` → e.g. `@{$handle}.tsx`) and change this template to
 * that route's path (`'/@{$handle}'`).
 *
 * The template must keep fixed text around the handle; a bare `/$handle` at
 * the root would collide with board pages.
 */
export const TALENT_PROFILE_ROUTE = '/p/$handle';

const HANDLE_TOKEN = /\{\$handle\}|\$handle/;

/**
 * Path builder and parser for one profile route template. Only the handle
 * (or opaque candidate id) is percent-encoded; the template's fixed text is
 * kept verbatim, so an `@` prefix never becomes `%40`.
 */
export function talentProfilePaths(template: string) {
  const match = HANDLE_TOKEN.exec(template);
  if (!match) {
    throw new Error(`Profile route template has no handle: ${template}`);
  }
  const prefix = template.slice(0, match.index);
  const suffix = template.slice(match.index + match[0].length);

  return {
    /** `/p/{param}` for a handle or an opaque candidate id. */
    path(param: string): string {
      return `${prefix}${encodeURIComponent(param)}${suffix}`;
    },
    /** The decoded param of a profile path, or `null` for any other path. */
    param(pathname: string): string | null {
      if (!pathname.startsWith(prefix) || !pathname.endsWith(suffix)) {
        return null;
      }
      const raw = pathname.slice(
        prefix.length,
        pathname.length - suffix.length,
      );
      if (!raw) return null;
      try {
        return decodeURIComponent(raw);
      } catch {
        return null;
      }
    },
  };
}

const profilePaths = talentProfilePaths(TALENT_PROFILE_ROUTE);

/** Profile path for a handle, or an opaque candidate id on unlock boards. */
export const talentProfilePath = profilePaths.path;

/** Inverse of `talentProfilePath`; `null` when the path is not a profile. */
export const talentProfileParam = profilePaths.param;

/** Typed router link to the profile route, for `Link` and `navigate`. */
export function talentProfileLink(param: string) {
  return linkOptions({
    to: TALENT_PROFILE_ROUTE,
    params: { handle: param },
  });
}
