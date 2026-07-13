/**
 * React Aria ↔ TanStack Router seam (CAV-480, ADR-0072): every Untitled
 * UI component that takes an `href` (Button-as-link, Link, MenuItem, …)
 * navigates through TanStack Router instead of a full document load.
 * Mounted once at the root layout, inside router context.
 *
 * `useHref` re-localizes rendered anchor hrefs the same way the router's
 * `rewrite.output` does, so middle-click / open-in-new-tab lands on the
 * locale-prefixed URL a left-click would navigate to.
 */
import { useRouter } from '@tanstack/react-router'
import { RouterProvider } from 'react-aria-components'

import { localizeHref } from '@/paraglide/runtime'

export function UntitledUiRouterProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  return (
    <RouterProvider
      navigate={(href) => router.navigate({ href })}
      useHref={(href) => localizeHref(href)}
    >
      {children}
    </RouterProvider>
  )
}
