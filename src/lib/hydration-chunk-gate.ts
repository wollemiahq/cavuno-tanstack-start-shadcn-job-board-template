/**
 * Keep a server-rendered page on screen when its route code fails to load.
 *
 * Hydration needs every matched route's lazy chunk. When one does not arrive
 * (a renderer that drops resources, a flaky network, a deploy that replaced
 * the chunk names), TanStack retries the match on the client, its lazy
 * component throws, and `AppRouteErrorPage` replaces the server-rendered
 * article. Googlebot's renderer hit exactly that on a builder board's blog
 * posts (2026-10-14: "7 of 137 page resources could not be loaded"), indexed
 * the error page, and reported the post as a soft 404.
 *
 * The page the server rendered is the page the visitor asked for, and its
 * links are plain anchors that still work without JavaScript. So when every
 * match rendered fully on the server and a chunk fails, hydration is held:
 * React keeps the server HTML exactly as it is. Visitors still get the
 * stale-chunk reload (see stale-chunk-reload-runtime.js), which fires on the
 * same failure; crawlers do not reload and keep the server page.
 *
 * Pages the server did not render in full (a pending shell, a client-only
 * or data-only route, an error or not-found match) take the usual path: the
 * client must render them, and the error page with its retry is the right
 * answer there.
 */
import type { AnyRouter } from '@tanstack/react-router';

/** The router surface the gate needs. */
export type HydrationChunkRouter = Pick<
  AnyRouter,
  'history' | 'parseLocation' | 'getMatchedRoutes' | 'loadRouteChunk'
>;

/**
 * The fields of a server match that TanStack hands the client in
 * `window.$_TSR.router.matches`: status, SSR mode, and global-not-found.
 */
export interface ServerRenderedMatch {
  s: string;
  ssr?: boolean | 'data-only';
  g?: true;
}

/** True when the server rendered every match in full, with its data. */
export function serverRenderedWholePage(
  matches: ReadonlyArray<ServerRenderedMatch> | undefined,
): boolean {
  return (
    matches !== undefined &&
    matches.length > 0 &&
    matches.every(
      (match) =>
        match.s === 'success' &&
        match.g !== true &&
        match.ssr !== false &&
        match.ssr !== 'data-only',
    )
  );
}

/**
 * Load the matched routes' chunks before hydration. Resolves when hydration
 * may go ahead; never settles when it must not, which leaves the server HTML
 * in place.
 */
export async function holdHydrationOnChunkFailure(
  router: HydrationChunkRouter,
  serverMatches: ReadonlyArray<ServerRenderedMatch> | undefined,
): Promise<void> {
  if (!serverRenderedWholePage(serverMatches)) return;
  const { pathname } = router.parseLocation(router.history.location);
  const [routes] = router.getMatchedRoutes(pathname);
  let loaded = true;
  try {
    await Promise.all(routes.map((route) => router.loadRouteChunk(route)));
    // A failed component import does not reject: `lazyRouteComponent`
    // records it and throws at render. On the client it drops `preload`
    // once the import succeeds, so a remaining `preload` is a failed chunk.
    loaded = routes.every((route) => !route.options.component?.preload);
  } catch {
    // A route's own lazy file (`lazyFn`) failed.
    loaded = false;
  }
  if (!loaded) await new Promise<never>(() => {});
}
