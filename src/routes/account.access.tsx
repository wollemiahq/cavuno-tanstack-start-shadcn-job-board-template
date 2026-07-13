/**
 * Candidate job-access paywall reference flow (doc 36 / ADR-0056):
 *
 *   offers → connected-account embedded checkout → poll grant → ungated + manage
 *
 * The loader fetches the entitlement + the offer tiers. A non-entitled viewer
 * picks a tier → `startCheckout` returns a mount kit → `<EmbeddedCheckout>`
 * mounts Stripe for the board's connected account. Stripe returns the buyer to
 * this route with `?session_id=…`; we poll `getAccessGrant` until it flips to
 * `hasAccess`, then re-render the entitled state (with a Manage-subscription
 * link for recurring grants).
 */
import { Text } from '@/components/text'
import { useCallback, useEffect, useState } from 'react'

import {
  createFileRoute,
  isRedirect,
  redirect,
  useRouter,
} from '@tanstack/react-router'

import type { AccessCheckoutSession, PaywallOffer } from '@cavuno/board'

import { EmbeddedCheckout } from '../components/paywall/embedded-checkout'
import {
  getAccessGrant,
  getPaywallOffers,
  openBillingPortal,
  startCheckout,
} from '../server/paywall'

import { CandidateShell } from '@/components/account-shell'
import { m } from '../paraglide/messages'

import { Badge } from '@/components/base/badges/badges'
import { Button } from '@/components/base/buttons/button'

const RETURN_PATH = '/account/access'

function isEmailUnverified(error: unknown) {
  return String(error).includes('EMAIL_UNVERIFIED')
}

function formatPrice(amountCents: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amountCents / 100)
}

export const Route = createFileRoute('/account/access')({
  validateSearch: (search: Record<string, unknown>) => ({
    session_id:
      typeof search.session_id === 'string' ? search.session_id : undefined,
  }),
  loader: async () => {
    try {
      const [grant, offers] = await Promise.all([
        getAccessGrant(),
        getPaywallOffers(),
      ])
      return { grant, offers: offers.data }
    } catch (error) {
      if (isRedirect(error)) throw error
      if (isEmailUnverified(error)) {
        throw redirect({ to: '/auth/verify-email-required' })
      }
      throw redirect({ to: '/auth/sign-in', search: { redirect: RETURN_PATH } })
    }
  },
  component: AccessPageShell,
})

function AccessPageShell() {
  return (
    <CandidateShell active="subscription">
      <AccessPage />
    </CandidateShell>
  )
}

function AccessPage() {
  const { grant, offers } = Route.useLoaderData()
  const { session_id } = Route.useSearch()
  const router = useRouter()

  const [kit, setKit] = useState<AccessCheckoutSession | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [exhausted, setExhausted] = useState(false)
  // Returning from Stripe with a session id means a checkout just completed —
  // poll the grant until the webhook has recorded it.
  const [polling, setPolling] = useState(
    Boolean(session_id) && !grant.hasAccess,
  )

  const hasAccess = grant.hasAccess || confirmed

  useEffect(() => {
    if (!polling || hasAccess) return
    let stop = false
    let attempts = 0
    // Track the LATEST scheduled timer so cleanup cancels the recursive one,
    // not just the first — otherwise a queued tick fires after unmount.
    let timerId: number
    const tick = async () => {
      attempts += 1
      const next = await getAccessGrant()
      if (stop) return
      if (next.hasAccess) {
        setConfirmed(true)
        setPolling(false)
        router.invalidate()
      } else if (attempts < 30) {
        timerId = window.setTimeout(tick, 2000)
      } else {
        setPolling(false)
        setExhausted(true)
      }
    }
    timerId = window.setTimeout(tick, 2000)
    return () => {
      stop = true
      window.clearTimeout(timerId)
    }
  }, [polling, hasAccess, router])

  // A stable reference so mounting the embedded checkout doesn't re-run its
  // effect (and destroy/remount the live Stripe iframe) on every render.
  const handleCheckoutComplete = useCallback(() => setPolling(true), [])

  async function buy(offer: PaywallOffer) {
    setBusy(offer.offerKey)
    try {
      const mountKit = await startCheckout({
        data: { offerKey: offer.offerKey, returnPath: RETURN_PATH },
      })
      setKit(mountKit)
    } finally {
      setBusy(null)
    }
  }

  async function manage() {
    setBusy('portal')
    try {
      const { url } = await openBillingPortal({ data: { returnPath: RETURN_PATH } })
      window.location.href = url
    } finally {
      setBusy(null)
    }
  }

  if (hasAccess) {
    return (
      <section className="mx-auto max-w-xl space-y-4 py-10">
        <div className="flex items-center gap-2">
          <Text as="h1" variant="heading1">{m.accountAccess_title()}</Text>
          <Badge color="brand">{m.accountAccess_activeBadge()}</Badge>
        </div>
        <p className="text-tertiary">
          {m.accountAccess_activeBody()}
        </p>
        {grant.offerType === 'recurring' ? (
          <Button onClick={manage} isDisabled={busy === 'portal'}>
            {busy === 'portal' ? m.accountAccess_openingLabel() : m.accountAccess_manageSubscriptionLabel()}
          </Button>
        ) : null}
        <div>
          <Button color="link-color" size="sm" href="/">
            {m.accountAccess_browseJobsLink()}
          </Button>
        </div>
      </section>
    )
  }

  if (kit) {
    return (
      <section className="mx-auto max-w-xl space-y-4 py-10">
        <Text as="h1" variant="heading1">{m.accountAccess_completePurchaseTitle()}</Text>
        <EmbeddedCheckout kit={kit} onComplete={handleCheckoutComplete} />
        <button
          type="button"
          className="text-sm underline"
          onClick={() => setKit(null)}
        >
          {m.accountAccess_backToPlansLabel()}
        </button>
      </section>
    )
  }

  if (polling) {
    return (
      <section className="mx-auto max-w-xl py-10">
        <p className="text-tertiary">{m.accountAccess_confirmingText()}</p>
      </section>
    )
  }

  if (exhausted) {
    return (
      <section className="mx-auto max-w-xl space-y-3 py-10">
        <Text as="h1" variant="heading1">{m.accountAccess_paymentReceivedTitle()}</Text>
        <p className="text-tertiary">
          {m.accountAccess_paymentReceivedBody()}
        </p>
        <Button onClick={() => router.invalidate()}>{m.accountAccess_refreshLabel()}</Button>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-xl space-y-6 py-10">
      <div className="space-y-2">
        <Text as="h1" variant="heading1">{m.accountAccess_unlockTitle()}</Text>
        <p className="text-tertiary">
          {m.accountAccess_unlockSubtitle()}
        </p>
      </div>
      {offers.length === 0 ? (
        <p className="text-tertiary">
          {m.accountAccess_noOffersText()}
        </p>
      ) : (
        <ul className="space-y-3">
          {offers.map((offer) => (
            <li
              key={offer.offerKey}
              className="flex items-center justify-between rounded-lg border p-4"
            >
              <div>
                <div className="flex items-center gap-2 font-medium">
                  {offer.label}
                  {offer.isDefault ? <Badge color="brand">{m.accountAccess_popularBadge()}</Badge> : null}
                </div>
                <div className="text-sm text-tertiary">
                  {formatPrice(offer.amountCents, offer.currency)} ·{' '}
                  {offer.billingLabel}
                </div>
              </div>
              <Button
                onClick={() => buy(offer)}
                isDisabled={busy === offer.offerKey}
              >
                {busy === offer.offerKey ? m.accountAccess_startingLabel() : m.accountAccess_chooseLabel()}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
