import { compileManifest } from '@cavuno/board/route-contract';
import {
  routeEntriesFromTanStackRouteTree,
  serializeManifest,
  WELL_KNOWN_CACHE_CONTROL,
  WELL_KNOWN_CONTENT_TYPE,
  type TanStackRouteNode,
} from '@cavuno/board/well-known';

import { localizeRouteTemplate } from '../lib/localized-path';
import { BOARD_URL_WORDS } from '../lib/url-words';
import { baseLocale } from '../paraglide/runtime';

import type { ManifestV1 } from '@cavuno/board/route-contract';

/** One locale's URL words: canonical segment → word. */
type LocaleUrlWords = Readonly<Record<string, string>> | undefined;

/** Role templates in the board language's URL words. */
function localizeManifest(
  manifest: ManifestV1,
  words: LocaleUrlWords,
): ManifestV1 {
  const roles = Object.fromEntries(
    Object.entries(manifest.roles).map(([role, template]) => [
      role,
      localizeRouteTemplate(template, words),
    ]),
  );
  return { ...manifest, roles };
}

/**
 * Serves the route manifest. Roles are classified on the canonical
 * (English) route tree, then each role's template is published in the
 * board language's words, so the platform links to the URLs the board
 * serves.
 */
export function createWellKnownRouteHandler(
  getRouteTree: () => TanStackRouteNode | Promise<TanStackRouteNode>,
  impressumEnabled: () => boolean | Promise<boolean> = () => true,
  words: LocaleUrlWords = BOARD_URL_WORDS[baseLocale],
) {
  return async (_request: Request): Promise<Response> => {
    try {
      const entries = routeEntriesFromTanStackRouteTree(await getRouteTree());
      const routes = (await impressumEnabled())
        ? entries
        : entries.filter((route) => route.template !== '/impressum');
      const { manifest } = compileManifest(routes);
      return new Response(
        serializeManifest(localizeManifest(manifest, words)),
        {
          status: 200,
          headers: {
            'content-type': WELL_KNOWN_CONTENT_TYPE,
            'cache-control': WELL_KNOWN_CACHE_CONTROL,
          },
        },
      );
    } catch {
      return new Response('', { status: 500 });
    }
  };
}
