/**
 * Catch-all splat — hosted-parity for the board's `[...rest]` route. Resolves
 * the board's configured redirects (board.redirects.resolve) and 308s to the
 * target, else 404s. Lowest-priority route: only matches a path no other route
 * claims (the hosted catch-all behaves the same).
 */
import { createFileRoute, notFound, redirect } from '@tanstack/react-router'

import { resolveRedirect } from '../server/queries'

export const Route = createFileRoute('/$')({
  loader: async ({ params }) => {
    const path = `/${params._splat ?? ''}`
    const { target } = await resolveRedirect({ data: { path } })
    if (target) {
      // 308 permanent — matches the hosted `permanentRedirect(target)`.
      throw redirect({ href: target, statusCode: 308 })
    }
    throw notFound()
  },
  component: () => null,
})
