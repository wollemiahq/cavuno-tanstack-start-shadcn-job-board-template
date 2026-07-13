import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { AuthCard, Field } from '../components/auth-form'
import { m } from '../paraglide/messages'
import { Button } from '@/components/base/buttons/button'
import { forgotPassword } from '../server/auth'

export const Route = createFileRoute('/auth/forgot-password')({
  head: () => ({ meta: [{ title: m.authForgotPassword_title() }] }),
  component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const [pending, setPending] = useState(false)

  if (sent) {
    return (
      <AuthCard
        title={m.authForgotPassword_checkEmailTitle()}
        supportingText={m.authForgotPassword_checkEmailBody()}
      >
        <Button color="secondary" size="lg" className="w-full" href="/auth/sign-in">
          {m.authForgotPassword_backToSignInLabel()}
        </Button>
      </AuthCard>
    )
  }

  return (
    <AuthCard title={m.authForgotPassword_title()}>
      <form
        className="flex flex-col gap-4"
        onSubmit={async (event) => {
          event.preventDefault()
          setPending(true)
          const form = new FormData(event.currentTarget)
          await forgotPassword({
            data: { email: String(form.get('email')) },
          })
          setPending(false)
          setSent(true)
        }}
      >
        <Field label={m.authForgotPassword_emailLabel()} name="email" type="email" autoComplete="email" />
        <Button type="submit" color="primary" size="lg" className="w-full" isDisabled={pending}>
          {pending ? m.authForgotPassword_sendingLabel() : m.authForgotPassword_submitLabel()}
        </Button>
      </form>
    </AuthCard>
  )
}
