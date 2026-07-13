/**
 * The connected-account embedded-checkout mount (doc 36 / ADR-0056). The SDK is
 * Stripe-agnostic and hands back a mount kit; this is where the frontend brings
 * `@stripe/stripe-js`. The critical detail: Stripe.js is initialised WITH the
 * board's connected account (`loadStripe(publishableKey, { stripeAccount })`)
 * so the embedded form renders that account's session — the mount the shared
 * hosted embed got wrong (doc 36 open-Q2).
 */
import { useEffect, useRef } from 'react'

import { loadStripe, type StripeEmbeddedCheckout } from '@stripe/stripe-js'

import type { AccessCheckoutSession } from '@cavuno/board'

export function EmbeddedCheckout({
  kit,
  onComplete,
}: {
  kit: AccessCheckoutSession
  onComplete?: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let instance: StripeEmbeddedCheckout | undefined
    let cancelled = false

    void (async () => {
      const stripe = await loadStripe(kit.publishableKey, {
        stripeAccount: kit.stripeAccountId,
      })
      if (!stripe || cancelled || !ref.current) return
      instance = await stripe.createEmbeddedCheckoutPage({
        clientSecret: kit.clientSecret,
        onComplete,
      })
      if (cancelled) {
        instance.destroy()
        return
      }
      instance.mount(ref.current)
    })()

    return () => {
      cancelled = true
      instance?.destroy()
    }
  }, [kit.clientSecret, kit.publishableKey, kit.stripeAccountId, onComplete])

  return <div ref={ref} data-testid="paywall-embedded-checkout" />
}
