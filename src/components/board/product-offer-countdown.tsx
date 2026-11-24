/**
 * The offer's countdown, ticking each minute. Worked out after hydration
 * only, so the server and browser clocks never disagree in the markup.
 */
import { useEffect, useState } from 'react';

import { m } from '../../paraglide/messages';

import { timeLeft } from '@/lib/product-offer';
import { cn } from '@/lib/utils';

/** Time left until `endsAt`; null before hydration, with no end, or after it. */
export function useOfferTimeLeft(endsAt: string | null) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (!endsAt) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, [endsAt]);
  return endsAt && now !== null ? timeLeft(endsAt, now) : null;
}

/** "Discount ends in 2 d 3 h", for the product page's buy card. */
export function ProductOfferCountdown({
  endsAt,
  className,
}: {
  endsAt: string | null;
  className?: string;
}) {
  const left = useOfferTimeLeft(endsAt);
  if (!left) return null;
  return (
    <p
      data-slot="product-offer-countdown"
      className={cn('text-muted-foreground text-sm', className)}
    >
      {left.days > 0
        ? m.purchase_offerEndsInDays({ days: left.days, hours: left.hours })
        : m.purchase_offerEndsInHours({
            hours: left.hours,
            minutes: left.minutes,
          })}
    </p>
  );
}
