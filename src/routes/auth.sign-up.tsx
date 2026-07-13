import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'

import { AuthCard, Field, FormError } from '../components/auth-form'
import { m } from '../paraglide/messages'
import { Button } from '@/components/base/buttons/button'
import { signUp } from '../server/auth'
import { getBoardContext } from '../server/queries'

export const Route = createFileRoute('/auth/sign-up')({
  loader: async () => {
    const board = await getBoardContext()
    return { boardName: board.name }
  },
  head: () => ({ meta: [{ title: m.authSignUp_title() }] }),
  component: SignUpPage,
})

function SignUpPage() {
  const router = useRouter()
  const { boardName } = Route.useLoaderData()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [registered, setRegistered] = useState(false)

  if (registered) {
    return (
      <AuthCard
        title={m.authSignUp_checkEmailTitle()}
        supportingText={m.authSignUp_checkEmailBody()}
      >
        <Button color="primary" size="lg" className="w-full" href="/account">
          {m.authSignUp_goToAccountLabel()}
        </Button>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title={m.authSignUp_title()}
      supportingText={m.authSignUp_supportingText({ boardName })}
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={async (event) => {
          event.preventDefault()
          setPending(true)
          setError(null)
          const form = new FormData(event.currentTarget)
          const result = await signUp({
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
        <Field label={m.authSignUp_nameLabel()} name="displayName" autoComplete="name" />
        <Field label={m.authSignUp_emailLabel()} name="email" type="email" autoComplete="email" />
        <Field
          label={m.authSignUp_passwordLabel()}
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
        />
        <FormError message={error} />
        <Button type="submit" color="primary" size="lg" className="w-full" isDisabled={pending}>
          {pending ? m.authSignUp_creatingAccountLabel() : m.authSignUp_submitLabel()}
        </Button>
      </form>
      <p className="text-center text-sm text-tertiary">
        {m.authSignUp_alreadyHaveAccountText()}{' '}
        <Button color="link-color" size="sm" href="/auth/sign-in">
          {m.authSignUp_signInLink()}
        </Button>
      </p>
    </AuthCard>
  )
}
