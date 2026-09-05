import { createRouter as createTanStackRouter } from '@tanstack/react-router';

import { NotFound } from './components/app-not-found';
import { RouteErrorPage } from './components/app-route-error';
import { delocalizeSegments, localizeSegments } from './lib/localized-path';
import { deLocalizeUrl, localizeUrl } from './paraglide/runtime';
import { routeTree } from './routeTree.gen';

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    // Master–detail panes keep their own overflow scroll from md up. Below md
    // the window is the scroller. Restoration only records positions for
    // client navigations. Listing result rows MUST use MasterDetailLink
    // (TanStack Link), not a plain <a>: a full document load with
    // history.scrollRestoration='manual' leaves a window-cache miss, and Back
    // falls back to scrollTo(0).
    // Without scrollToTopSelectors, TanStack copies the previous location's
    // element scroll onto the next page — landing mid-list on page N, or
    // mid-profile in the detail pane. Selection-only navigations pass
    // `resetScroll: false` and skip this path, so the list keeps its place
    // when picking a result.
    scrollToTopSelectors: [
      '[data-slot="search-results-list"]',
      '[data-slot="search-result-detail"]',
    ],
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
    // built-in placeholder.
    defaultNotFoundComponent: NotFound,
    // A rejected loader is rendered IN PLACE at the failing match, never
    // rethrown to the root: on the server `Match` renders
    // `(route.errorComponent ?? defaultErrorComponent) || ErrorComponent`, so
    // without this default a Board API failure on any public page ships
    // TanStack's unstyled "Something went wrong!" in the HTML — and, since
    // that component never mounts `useClientErrorReport`, Cavuno never hears
    // about it. The client path does rethrow, which is why the root
    // `errorComponent` alone looked sufficient in jsdom tests. The candidate
    // routes keep their own `CandidateRouteErrorPage`; the root keeps the
    // standalone `AppRouteErrorPage` for a failing root loader.
    defaultErrorComponent: RouteErrorPage,
    // Paraglide locale routing: route matching sees the
    // delocalized path (/de/jobs → /jobs), rendered hrefs re-localize for
    // the current locale. The base locale stays unprefixed.
    rewrite: {
      // Localized section slugs (/fr/emplois) translate to canonical
      // segments before Paraglide strips the prefix, and back after it
      // re-applies one — see src/lib/localized-path.ts.
      input: ({ url }) => {
        const incoming = new URL(url);
        incoming.pathname = delocalizeSegments(incoming.pathname);
        return deLocalizeUrl(incoming);
      },
      output: ({ url }) => {
        const localized = new URL(localizeUrl(url));
        localized.pathname = localizeSegments(localized.pathname);
        return localized;
      },
    },
  });

  return router;
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
