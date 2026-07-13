/** OAuth completion landing — exchanges the callback one-time token. */
import { createFileRoute, redirect } from '@tanstack/react-router'

import { AuthCard } from '../components/auth-form'
import { m } from '../paraglide/messages'
import { exchangeOAuth } from '../server/auth'

import { Button } from '@/components/base/buttons/button'

interface OAuthCompleteSearch {
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

export const Route = createFileRoute('/auth/oauth-complete')({
  validateSearch: (search: Record<string, unknown>): OAuthCompleteSearch => ({
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
    const result = await exchangeOAuth({ data: { token: deps.token } })
    if (!result.ok) return { status: 'invalid' as const }
    throw redirect({ href: safeReturnTo(deps.returnTo) })
  },
  head: () => ({ meta: [{ title: m.authOauthComplete_title() }] }),
  component: OAuthCompletePage,
})

function OAuthCompletePage() {
  const { status } = Route.useLoaderData()

  return (
    <AuthCard
      title={m.authOauthComplete_failedTitle()}
      supportingText={
        status === 'missing-token'
          ? m.authOauthComplete_missingTokenBody()
          : m.authOauthComplete_invalidBody()
      }
    >
      <Button color="secondary" size="lg" className="w-full" href="/auth/sign-in">
        {m.authOauthComplete_signInLabel()}
      </Button>
    </AuthCard>
  )
}
