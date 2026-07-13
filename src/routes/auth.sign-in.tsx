import { useState } from 'react'

import { createFileRoute, useRouter } from '@tanstack/react-router'

import { AuthCard, AuthDivider, Field, FormError } from '../components/auth-form'
import { m } from '../paraglide/messages'
import { Button } from '@/components/base/buttons/button'
import {
  ButtonGroup,
  ButtonGroupItem,
} from '@/components/base/button-group/button-group'
import { SocialButton } from '@/components/base/buttons/social-button'
import {
  getOAuthAuthorizationUrl,
  requestMagicLink,
  signIn,
} from '../server/auth'

export const Route = createFileRoute('/auth/sign-in')({
  head: () => ({ meta: [{ title: m.authSignIn_title() }] }),
  component: SignInPage,
})

function SignInPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'password' | 'magic'>('password')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [sent, setSent] = useState(false)

  async function startOAuth(provider: 'google' | 'linkedin') {
    setPending(true)
    setError(null)
    const result = await getOAuthAuthorizationUrl({
      data: { provider, returnTo: '/account' },
    })
    if (result.ok) {
      window.location.assign(result.authorizeUrl)
      return
    }
    setPending(false)
    setError(result.message)
  }

  return (
    <AuthCard title={m.authSignIn_title()}>
      <ButtonGroup
        size="md"
        className="w-full"
        selectedKeys={[mode]}
        disallowEmptySelection
        onSelectionChange={(keys) => {
          const next = [...keys][0] as 'password' | 'magic' | undefined
          if (!next) return
          setMode(next)
          setError(null)
          setSent(false)
        }}
      >
        <ButtonGroupItem id="password" className="flex-1 justify-center">
          {m.authSignIn_passwordTabLabel()}
        </ButtonGroupItem>
        <ButtonGroupItem id="magic" className="flex-1 justify-center">
          {m.authSignIn_magicLinkTabLabel()}
        </ButtonGroupItem>
      </ButtonGroup>

      {sent ? (
        <p className="rounded-lg bg-secondary p-3 text-sm text-tertiary">
          {m.authSignIn_magicLinkSentText()}
        </p>
      ) : null}

      <form
        className="flex flex-col gap-4"
        onSubmit={async (event) => {
          event.preventDefault()
          setPending(true)
          setError(null)
          const form = new FormData(event.currentTarget)
          const email = String(form.get('email'))
          const result =
            mode === 'password'
              ? await signIn({
                  data: {
                    email,
                    password: String(form.get('password')),
                  },
                })
              : await requestMagicLink({
                  data: {
                    email,
                    returnTo: '/account',
                  },
                })
          setPending(false)
          if (result.ok && mode === 'password') {
            await router.invalidate()
            await router.navigate({ to: '/account' })
          } else if (result.ok) {
            setSent(true)
          } else {
            setError(result.message)
          }
        }}
      >
        <Field label={m.authSignIn_emailLabel()} name="email" type="email" autoComplete="email" />
        {mode === 'password' ? (
          <Field
            label={m.authSignIn_passwordLabel()}
            name="password"
            type="password"
            autoComplete="current-password"
          />
        ) : null}
        {mode === 'password' ? (
          <div className="flex justify-end">
            <Button color="link-color" size="sm" href="/auth/forgot-password">
              {m.authSignIn_forgotPasswordLink()}
            </Button>
          </div>
        ) : null}
        <FormError message={error} />
        <Button type="submit" color="primary" size="lg" className="w-full" isDisabled={pending}>
          {pending
            ? mode === 'password'
              ? m.authSignIn_signingInLabel()
              : m.authSignIn_sendingLabel()
            : mode === 'password'
            ? m.authSignIn_submitLabel()
            : m.authSignIn_sendMagicLinkLabel()}
        </Button>
      </form>

      <AuthDivider label={m.authOrDividerLabel()} />

      <div className="flex flex-col gap-3">
        <SocialButton
          social="google"
          size="lg"
          className="w-full"
          disabled={pending}
          onClick={() => void startOAuth('google')}
        >
          {m.authSignIn_continueWithGoogleLabel()}
        </SocialButton>
        <Button
          type="button"
          color="secondary"
          size="lg"
          className="w-full"
          isDisabled={pending}
          onClick={() => void startOAuth('linkedin')}
        >
          {m.authSignIn_continueWithLinkedinLabel()}
        </Button>
      </div>

      <p className="text-center text-sm text-tertiary">
        <Button color="link-color" size="sm" href="/auth/sign-up">
          {m.authSignIn_createAccountLink()}
        </Button>
      </p>
    </AuthCard>
  )
}
