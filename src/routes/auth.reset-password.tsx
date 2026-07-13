/** Reset-password landing — the route reset emails link to (ADR-0035). */
import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'

import { AuthCard, Field, FormError } from '../components/auth-form'
import { m } from '../paraglide/messages'
import { Button } from '@/components/base/buttons/button'
import { resetPassword } from '../server/auth'

interface ResetSearch {
  token?: string
}

export const Route = createFileRoute('/auth/reset-password')({
  validateSearch: (search: Record<string, unknown>): ResetSearch => ({
    token:
      typeof search.token === 'string' && search.token
        ? search.token
        : undefined,
  }),
  head: () => ({ meta: [{ title: m.authResetPassword_title() }] }),
  component: ResetPasswordPage,
})

function ResetPasswordPage() {
  const { token } = Route.useSearch()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [done, setDone] = useState(false)

  if (!token) {
    return (
      <AuthCard
        title={m.authResetPassword_invalidTitle()}
        supportingText={m.authResetPassword_invalidBody()}
      >
        <Button color="secondary" size="lg" className="w-full" href="/auth/forgot-password">
          {m.authResetPassword_requestNewLinkLabel()}
        </Button>
      </AuthCard>
    )
  }

  if (done) {
    return (
      <AuthCard
        title={m.authResetPassword_updatedTitle()}
        supportingText={m.authResetPassword_updatedBody()}
      >
        <Button color="primary" size="lg" className="w-full" href="/auth/sign-in">
          {m.authResetPassword_signInLabel()}
        </Button>
      </AuthCard>
    )
  }

  return (
    <AuthCard title={m.authResetPassword_title()}>
      <form
        className="flex flex-col gap-4"
        onSubmit={async (event) => {
          event.preventDefault()
          setPending(true)
          setError(null)
          const form = new FormData(event.currentTarget)
          const result = await resetPassword({
            data: { token, password: String(form.get('password')) },
          })
          setPending(false)
          if (result.ok) {
            await router.invalidate()
            setDone(true)
          } else {
            setError(m.authResetPassword_expiredError())
          }
        }}
      >
        <Field
          label={m.authResetPassword_newPasswordLabel()}
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
        />
        <FormError message={error} />
        <Button type="submit" color="primary" size="lg" className="w-full" isDisabled={pending}>
          {pending ? m.authResetPassword_updatingLabel() : m.authResetPassword_submitLabel()}
        </Button>
      </form>
    </AuthCard>
  )
}
