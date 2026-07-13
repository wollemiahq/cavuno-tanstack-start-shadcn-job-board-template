/**
 * Verification-required gate for authenticated starter routes (ADR-0055).
 * The signed-in-but-unverified candidate either enters the 6-digit OTP from the
 * verification email (`board.auth.verifyEmailWithCode`) or opens the magic link
 * (which lands on `/auth/verify-email`). Resend re-sends both.
 */
import { useState } from 'react'

import { createFileRoute, useRouter } from '@tanstack/react-router'

import { AuthCard, FormError } from '../components/auth-form'
import { m } from '../paraglide/messages'
import { resendOtp, verifyOtpCode } from '../server/auth'

import { Button } from '@/components/base/buttons/button'
import { PinInput } from '@/components/base/input/pin-input'

export const Route = createFileRoute('/auth/verify-email-required')({
  head: () => ({ meta: [{ title: m.authVerifyEmailRequired_title() }] }),
  component: VerifyEmailRequiredPage,
})

function VerifyEmailRequiredPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)

  return (
    <AuthCard
      title={m.authVerifyEmailRequired_cardTitle()}
      supportingText={m.authVerifyEmailRequired_introText()}
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={async (event) => {
          event.preventDefault()
          setPending(true)
          setError(null)
          const form = new FormData(event.currentTarget)
          const result = await verifyOtpCode({
            data: { code: String(form.get('code')).trim() },
          })
          setPending(false)
          if (result.ok) {
            await router.invalidate()
            await router.navigate({ to: '/account' })
          } else {
            setError(result.message)
          }
        }}
      >
        <PinInput size="xs" className="items-center">
          <PinInput.Label>{m.authVerifyEmailRequired_codeLabel()}</PinInput.Label>
          {/* The vendored OTP input renders one real `<input name="code">`
              (visually hidden) carrying the typed digits, so the existing
              FormData submit path is unchanged. */}
          <PinInput.Group
            name="code"
            maxLength={6}
            inputMode="numeric"
            autoComplete="one-time-code"
            data-test="otp-code"
          >
            <PinInput.Slot index={0} />
            <PinInput.Slot index={1} />
            <PinInput.Slot index={2} />
            <PinInput.Slot index={3} />
            <PinInput.Slot index={4} />
            <PinInput.Slot index={5} />
          </PinInput.Group>
        </PinInput>
        <FormError message={error} />
        <Button
          type="submit"
          color="primary"
          size="lg"
          className="w-full"
          isDisabled={pending}
          data-test="otp-verify"
        >
          {pending ? m.authVerifyEmailRequired_verifyingLabel() : m.authVerifyEmailRequired_verifyLabel()}
        </Button>
      </form>

      {resent ? (
        <p className="rounded-lg bg-secondary p-3 text-sm text-tertiary">
          {m.authVerifyEmailRequired_resentText()}
        </p>
      ) : null}

      <Button
        type="button"
        color="secondary"
        size="lg"
        className="w-full"
        data-test="otp-resend"
        isDisabled={resending}
        onClick={async () => {
          setError(null)
          setResent(false)
          setResending(true)
          const result = await resendOtp()
          setResending(false)
          if (result.ok) {
            setResent(true)
          } else {
            setError(result.message)
          }
        }}
      >
        {resending ? m.authVerifyEmailRequired_sendingLabel() : m.authVerifyEmailRequired_resendLabel()}
      </Button>

      <Button color="tertiary" size="lg" className="w-full" href="/auth/sign-in">
        {m.authVerifyEmailRequired_backToSignInLabel()}
      </Button>
    </AuthCard>
  )
}
