/** Magic-link landing — consumes ?token= and creates the starter session. */
import { createFileRoute, redirect } from '@tanstack/react-router'

import { AuthCard } from '../components/auth-form'
import { m } from '../paraglide/messages'
import { consumeMagicLink } from '../server/auth'

import { Button } from '@/components/base/buttons/button'

interface MagicLinkSearch {
  token?: string
  returnTo?: string
}

function safeReturnTo(value: string | undefined) {
  if (!value) return '/account'
  if (
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('://')
  ) {
    return '/account'
  }
  return value
}

export const Route = createFileRoute('/auth/magic-link')({
  validateSearch: (search: Record<string, unknown>): MagicLinkSearch => ({
    token:
      typeof search.token === 'string' && search.token
        ? search.token
        : undefined,
    returnTo:
      typeof search.returnTo === 'string' && search.returnTo
        ? search.returnTo
        : undefined,
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    if (!deps.token) return { status: 'missing-token' as const }
    const result = await consumeMagicLink({ data: { token: deps.token } })
    if (!result.ok) return { status: 'invalid' as const }
    throw redirect({ href: safeReturnTo(deps.returnTo) })
  },
  head: () => ({ meta: [{ title: m.authMagicLink_title() }] }),
  component: MagicLinkPage,
})

function MagicLinkPage() {
  const { status } = Route.useLoaderData()

  return (
    <AuthCard
      title={m.authMagicLink_invalidTitle()}
      supportingText={
        status === 'missing-token'
          ? m.authMagicLink_missingTokenBody()
          : m.authMagicLink_invalidBody()
      }
    >
      <Button color="secondary" size="lg" className="w-full" href="/auth/sign-in">
        {m.authMagicLink_signInLabel()}
      </Button>
    </AuthCard>
  )
}
