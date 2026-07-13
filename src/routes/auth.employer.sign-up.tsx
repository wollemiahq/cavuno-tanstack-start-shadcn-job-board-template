import { useState } from 'react'
import { createFileRoute, notFound, useRouter } from '@tanstack/react-router'

import { AuthCard, Field, FormError } from '../components/auth-form'
import { m } from '../paraglide/messages'
import { Button } from '@/components/base/buttons/button'
import { signUpEmployer } from '../server/auth'
import { getBoardContext } from '../server/queries'

/**
 * Employer sign-up — the branded funnel `/auth/join` points employers at.
 * Gated on `board.features.employers` (404 when the board has no employer
 * surface). No new API: `signUpEmployer` registers with `role: 'employer'`;
 * next stop is the dashboard, where they connect/claim a company.
 */
export const Route = createFileRoute('/auth/employer/sign-up')({
  loader: async () => {
    const board = await getBoardContext()
    if (!board.features.employers) throw notFound()
    return { boardName: board.name }
  },
  head: () => ({ meta: [{ title: m.authEmployerSignUp_title() }] }),
  component: EmployerSignUpPage,
  notFoundComponent: () => (
    <p className="rounded-lg border border-dashed border-secondary p-10 text-center text-tertiary">
      {m.authEmployerSignUp_notAvailableText()}
    </p>
  ),
})

function EmployerSignUpPage() {
  const router = useRouter()
  const { boardName } = Route.useLoaderData()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [registered, setRegistered] = useState(false)

  if (registered) {
    return (
      <AuthCard
        title={m.authEmployerSignUp_checkEmailTitle()}
        supportingText={m.authEmployerSignUp_checkEmailBody()}
      >
        <Button color="primary" size="lg" className="w-full" href="/employers/dashboard">
          {m.authEmployerSignUp_goToDashboardLabel()}
        </Button>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title={m.authEmployerSignUp_cardTitle({ boardName })}
      supportingText={m.authEmployerSignUp_supportingText()}
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={async (event) => {
          event.preventDefault()
          setPending(true)
          setError(null)
          const form = new FormData(event.currentTarget)
          const result = await signUpEmployer({
            data: {
              displayName: String(form.get('displayName')),
              email: String(form.get('email')),
              password: String(form.get('password')),
            },
          })
          setPending(false)
          if (result.ok) {
            await router.invalidate()
            setRegistered(true)
          } else {
            setError(result.message)
          }
        }}
      >
        <Field label={m.authEmployerSignUp_nameLabel()} name="displayName" autoComplete="name" />
        <Field
          label={m.authEmployerSignUp_workEmailLabel()}
          name="email"
          type="email"
          autoComplete="email"
        />
        <Field
          label={m.authEmployerSignUp_passwordLabel()}
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
        />
        <FormError message={error} />
        <Button type="submit" color="primary" size="lg" className="w-full" isDisabled={pending}>
          {pending ? m.authEmployerSignUp_creatingAccountLabel() : m.authEmployerSignUp_submitLabel()}
        </Button>
      </form>
      <p className="text-center text-sm text-tertiary">
        {m.authEmployerSignUp_lookingForWorkText()}{' '}
        <Button color="link-color" size="sm" href="/auth/sign-up">
          {m.authEmployerSignUp_joinAsCandidateLink()}
        </Button>
      </p>
    </AuthCard>
  )
}
