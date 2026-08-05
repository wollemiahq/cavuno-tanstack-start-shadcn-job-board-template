/**
 * The connected-account embedded-checkout mount. The SDK is
 * Stripe-agnostic and hands back a mount kit; this is where the frontend brings
 * `@stripe/stripe-js`. The critical detail: Stripe.js is initialised WITH the
 * board's connected account (`loadStripe(publishableKey, { stripeAccount })`)
 * so the embedded form renders that account's session — the mount the shared
 * hosted embed got wrong.
 *
 * The mount node stays in the DOM the whole time (Stripe needs a stable ref);
 * a centred spinner overlays it until the form finishes mounting so the panel
 * never flashes an empty box while Stripe.js loads over the network.
 */
import { useEffect, useRef, useState } from 'react';

import { m } from '../../paraglide/messages';

import { Spinner } from '@/components/ui/spinner';
import type { AccessCheckoutSession } from '@cavuno/board';
import type { StripeEmbeddedCheckout } from '@stripe/stripe-js';

export function EmbeddedCheckout({
  kit,
  onComplete,
}: {
  kit: AccessCheckoutSession;
  onComplete?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let instance: StripeEmbeddedCheckout | undefined;
    let cancelled = false;
    setLoading(true);

    void (async () => {
      // Keep Stripe's loader out of the public app shell. Import it only after
      // a buyer has reached checkout and a mount kit actually exists.
      const { loadStripe } = await import('@stripe/stripe-js');
      const stripe = await loadStripe(kit.publishableKey, {
        stripeAccount: kit.stripeAccountId,
      });
      if (!stripe || cancelled || !ref.current) return;
      instance = await stripe.createEmbeddedCheckoutPage({
        clientSecret: kit.clientSecret,
        onComplete,
      });
      if (cancelled) {
        instance.destroy();
        return;
      }
      instance.mount(ref.current);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
      instance?.destroy();
    };
  }, [kit.clientSecret, kit.publishableKey, kit.stripeAccountId, onComplete]);

  return (
    <div className="relative min-h-80">
      {loading ? (
        <div
          className="text-muted-foreground absolute inset-0 flex flex-col items-center justify-center gap-3"
          data-testid="paywall-checkout-loading"
        >
          <Spinner className="size-6" />
          <p className="text-sm">{m.accountAccess_checkoutLoadingText()}</p>
        </div>
      ) : null}
      <div ref={ref} data-testid="paywall-embedded-checkout" />
    </div>
  );
}
