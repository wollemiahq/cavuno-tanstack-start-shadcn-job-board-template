import { createRouter as createTanStackRouter } from '@tanstack/react-router';

import { NotFound } from './components/app-not-found';
import { deLocalizeUrl, localizeUrl } from './paraglide/runtime';
import { routeTree } from './routeTree.gen';

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: 'intent',
    // Without this, navigation treats all route data as stale (`staleTime`
    // defaults to 0) and re-runs the loader on click even when the intent
    // preload just fetched it — the hover work is paid for and thrown away.
    // Note `preloadStaleTime` governs only re-preloading, not navigation, so
    // it cannot fix that. At 30s, a hovered link commits from cache
    // (measured: click → content 119ms, zero requests, vs ~1.9s cold);
    // route data can be up to 30s stale on quick revisits — acceptable for
    // job board content.
    defaultStaleTime: 30_000,
    // The default 404 is a real shadcn Empty page instead of TanStack's
    // built-in placeholder. The error boundary is deliberately NOT set here:
    // a router-wide default would give every route its own boundary, so an
    // error would never reach the root's `errorComponent`.
    defaultNotFoundComponent: NotFound,
    // Paraglide locale routing (ADR-0063): route matching sees the
    // delocalized path (/de/jobs → /jobs), rendered hrefs re-localize for
    // the current locale. The base locale stays unprefixed (D5).
    rewrite: {
      input: ({ url }) => deLocalizeUrl(url),
      output: ({ url }) => localizeUrl(url),
    },
  });

  return router;
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
