/**
 * Employer onboarding — the pending states for one company connection
 * (Paper screens 4–8): enter work email → email sent (resend / change
 * email) → awaiting admin; rejected shows the decline note. An approved
 * membership redirects straight to the company workspace.
 */
import { Text } from '@/components/text'
import { useState } from 'react'
import {
  createFileRoute,
  isRedirect,
  redirect,
  useRouter,
} from '@tanstack/react-router'
import type { CompanyMembership } from '@cavuno/board'

import { CompanyAvatar } from '@/components/board/company-avatar'
import { cancelClaim, listCompanies, sendWorkEmail } from '../server/employers'
import { Button } from '@/components/base/buttons/button'
import { Input } from '@/components/base/input/input'
import { m } from '../paraglide/messages'

export const Route = createFileRoute('/employers/onboarding/$slug')({
  loader: async ({ params }) => {
    let memberships
    try {
      memberships = await listCompanies()
    } catch (error) {
      if (isRedirect(error)) throw error
      throw redirect({ to: '/auth/sign-in', search: { returnTo: undefined } })
    }
    const membership = memberships.data.find(
      (candidate) => candidate.company.slug === params.slug,
    )
    if (!membership) throw redirect({ to: '/employers/dashboard' })
    if (membership.status === 'approved') {
      throw redirect({
        to: '/employers/companies/$slug',
        params: { slug: params.slug },
      })
    }
    return { membership }
  },
  head: () => ({ meta: [{ title: m.employerDashboard_metaTitle() }] }),
  component: OnboardingPage,
})

function OnboardingPage() {
  const { membership } = Route.useLoaderData()
  const { slug } = Route.useParams()

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center py-24 text-center">
      <CompanyAvatar
        name={membership.company.name}
        logoUrl={membership.company.logoUrl}
        size="lg"
      />
      <div className="mt-6 w-full">
        {membership.status === 'pending_work_email' ? (
          <WorkEmailStep slug={slug} membership={membership} />
        ) : membership.status === 'awaiting_admin' ? (
          <StaticStep
            title={m.employerOnboarding_awaitingAdminTitle()}
            body={m.employerOnboarding_awaitingAdminBody({
              company: membership.company.name,
            })}
          />
        ) : (
          <StaticStep
            title={m.employerOnboarding_rejectedTitle()}
            body={m.employerOnboarding_rejectedBody({
              company: membership.company.name,
            })}
          />
        )}
      </div>
      <FooterActions slug={slug} />
    </div>
  )
}

/** Screens 4/5/7/7b — enter work email ↔ email sent (resend / change). */
function WorkEmailStep({
  slug,
  membership,
}: {
  slug: string
  membership: CompanyMembership
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(!membership.workEmail)
  const [email, setEmail] = useState(membership.workEmail ?? '')
  const [status, setStatus] = useState<'idle' | 'sending' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function send(target: string) {
    setStatus('sending')
    setMessage('')
    const result = await sendWorkEmail({
      data: { slug, body: { workEmail: target } },
    })
    if (!result.ok) {
      setStatus('error')
      setMessage(result.message)
      return
    }
    setStatus('idle')
    setEditing(false)
    await router.invalidate()
  }

  if (!editing && membership.workEmail) {
    // Screens 5/7 — the link is out; wait for the click.
    return (
      <div className="space-y-4">
        <Text as="h1" variant="heading1">
          {m.employerOnboarding_emailSentTitle()}
        </Text>
        <p className="text-tertiary">
          {m.employerOnboarding_emailSentBody({ email: membership.workEmail })}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button
            color="secondary"
            size="md"
            isDisabled={status === 'sending'}
            onClick={() => send(membership.workEmail!)}
          >
            {status === 'sending'
              ? m.employerDashboard_sendingLabel()
              : m.employerOnboarding_resendLabel()}
          </Button>
          <Button color="tertiary" size="md" onClick={() => setEditing(true)}>
            {m.employerOnboarding_changeEmailLabel()}
          </Button>
        </div>
        {status === 'error' ? (
          <p className="text-error-primary text-sm">{message}</p>
        ) : null}
      </div>
    )
  }

  // Screens 4/7b — enter (or change) the work email.
  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault()
        void send(email.trim())
      }}
    >
      <Text as="h1" variant="heading1">
        {m.employerOnboarding_verifyTitle()}
      </Text>
      <p className="text-tertiary">
        {m.employerOnboarding_verifyBody({ company: membership.company.name })}
      </p>
      <div className="mx-auto max-w-sm text-left">
        <Input
          label={m.employerDashboard_workEmailLabel()}
          type="email"
          value={email}
          placeholder={m.employerDashboard_workEmailPlaceholder()}
          onChange={setEmail}
          isRequired
          autoFocus
        />
      </div>
      <div className="flex flex-col items-center gap-2">
        <Button
          type="submit"
          color="primary"
          size="md"
          className="w-full max-w-sm"
          isDisabled={status === 'sending'}
        >
          {status === 'sending'
            ? m.employerDashboard_sendingLabel()
            : m.employerDashboard_sendLinkLabel()}
        </Button>
        {membership.workEmail ? (
          <Button
            type="button"
            color="tertiary"
            size="md"
            onClick={() => setEditing(false)}
          >
            {m.employerOnboarding_backLabel()}
          </Button>
        ) : null}
      </div>
      {status === 'error' ? (
        <p className="text-error-primary text-sm">{message}</p>
      ) : null}
    </form>
  )
}

function StaticStep({ title, body }: { title: string; body: string }) {
  return (
    <div className="space-y-3">
      <Text as="h1" variant="heading1">{title}</Text>
      <p className="text-tertiary">{body}</p>
    </div>
  )
}

function FooterActions({ slug }: { slug: string }) {
  const router = useRouter()
  return (
    <div className="mt-10 flex items-center gap-2">
      <Button color="secondary" size="sm" href="/employers/dashboard">
        {m.employerOnboarding_backLabel()}
      </Button>
      <Button
        color="tertiary"
        size="sm"
        onClick={async () => {
          await cancelClaim({ data: { slug } })
          await router.invalidate()
          await router.navigate({ to: '/employers/dashboard' })
        }}
      >
        {m.employerDashboard_cancelClaimLabel()}
      </Button>
    </div>
  )
}
