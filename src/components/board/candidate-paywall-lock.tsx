import { Lock } from 'lucide-react';

import { m } from '../../paraglide/messages';
import { getLocale } from '../../paraglide/runtime';

import { EmptyState } from '@/components/empty-state';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { localizePath } from '@/lib/localized-path';
import type { PaywallOffer } from '@cavuno/board';

/**
 * Stands in for a candidate feature the viewer's job-seeker plan does not
 * unlock. Entitlements are per plan and are not on the wire, so this is
 * rendered from the board's 403, never pre-computed from a context flag.
 *
 * The CTA is the one gated job listings already use — `/account/access` with
 * the originating path as `returnTo` — so a buyer lands back where they were.
 * `title` names the feature; the offers come from `board.paywall.offers()`.
 */
export function CandidatePaywallLock({
  title,
  offers,
  returnTo,
}: {
  title: string;
  offers: PaywallOffer[];
  /** Same-origin path the buyer returns to after checkout. */
  returnTo: string;
}) {
  const locale = getLocale();
  return (
    <EmptyState
      icon={<Lock aria-hidden="true" />}
      title={title}
      description={m.candidatePaywallLock_description()}
      action={
        <div className="flex flex-col items-center gap-3">
          {offers.length > 0 ? (
            <div className="flex flex-wrap justify-center gap-2">
              {offers.map((offer) => (
                <Badge key={offer.offerKey} variant="outline">
                  {`${offer.label} · ${new Intl.NumberFormat(locale, {
                    style: 'currency',
                    currency: offer.currency.toUpperCase(),
                  }).format(offer.amountCents / 100)}`}
                </Badge>
              ))}
            </div>
          ) : null}
          <a
            href={localizePath(
              `/account/access?${new URLSearchParams({ returnTo }).toString()}`,
            )}
            className={buttonVariants()}
          >
            {m.candidatePaywallLock_ctaLabel()}
          </a>
        </div>
      }
    />
  );
}
