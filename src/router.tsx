import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { NotFound } from './components/untitled-ui/not-found'
import { routeTree } from './routeTree.gen'
import { deLocalizeUrl, localizeUrl } from './paraglide/runtime'

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    // The CAV-480 pilot: the default 404 is a real page (Untitled UI
    // Button CTA) instead of TanStack's built-in placeholder.
    defaultNotFoundComponent: NotFound,
    // Paraglide locale routing (ADR-0063): route matching sees the
    // delocalized path (/de/jobs → /jobs), rendered hrefs re-localize for
    // the current locale. The base locale stays unprefixed (D5).
    rewrite: {
      input: ({ url }) => deLocalizeUrl(url),
      output: ({ url }) => localizeUrl(url),
    },
  })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
