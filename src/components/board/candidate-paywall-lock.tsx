import { Check, Lock } from 'lucide-react';

import { m } from '../../paraglide/messages';
import { getLocale } from '../../paraglide/runtime';

import {
  offerBillingLabel,
  type CandidatePaywallOffer,
} from '@/board/paywall-offer';
import { EmptyState } from '@/components/empty-state';
import { Text } from '@/components/text';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from '@/components/ui/empty';
import { localizePath } from '@/lib/localized-path';
import { cn } from '@/lib/utils';

/**
 * Plan details for a candidate feature refused by the board's authoritative
 * 403. Configured benefits describe each plan; they never infer entitlement.
 * The shared CTA keeps the existing plan-picker and checkout return path.
 */
export function CandidatePaywallLock({
  title,
  offers,
  returnTo,
}: {
  title: string;
  offers: CandidatePaywallOffer[];
  /** Same-origin path the buyer returns to after checkout. */
  returnTo: string;
}) {
  const locale = getLocale();
  const browseJobs = (
    <a
      href={localizePath('/jobs')}
      className={buttonVariants({ variant: 'outline' })}
    >
      {m.accountAccess_browseJobsLink()}
    </a>
  );

  if (offers.length === 0) {
    return (
      <EmptyState
        icon={<Lock aria-hidden="true" />}
        title={title}
        description={m.candidatePaywallLock_noOffersText()}
        action={browseJobs}
      />
    );
  }

  return (
    <section className="flex flex-col items-center gap-8 py-8">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Lock aria-hidden="true" />
        </EmptyMedia>
        <Text as="h1" variant="heading1" className="text-center">
          {title}
        </Text>
        <EmptyDescription className="text-center">
          {m.candidatePaywallLock_description()}
        </EmptyDescription>
      </EmptyHeader>

      <div
        className={cn(
          'grid w-full gap-4',
          offers.length === 1 ? 'max-w-md' : 'max-w-4xl sm:grid-cols-2',
          offers.length > 2 && 'lg:grid-cols-3',
        )}
      >
        {offers.map((offer) => (
          <Card key={offer.offerKey}>
            <CardHeader>
              <CardTitle role="heading" aria-level={2}>
                {offer.label}
              </CardTitle>
              {offer.isDefault ? (
                <CardAction>
                  <Badge variant="secondary">
                    {m.candidatePaywallLock_recommendedBadge()}
                  </Badge>
                </CardAction>
              ) : null}
              {offer.description ? (
                <CardDescription>{offer.description}</CardDescription>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-1">
                <Text as="p" variant="heading1">
                  {new Intl.NumberFormat(locale, {
                    style: 'currency',
                    currency: offer.currency.toUpperCase(),
                    currencyDisplay: 'code',
                  }).format(offer.amountCents / 100)}
                </Text>
                <Text variant="secondary" size="sm">
                  {offerBillingLabel(offer)}
                </Text>
              </div>
              {offer.benefits && offer.benefits.length > 0 ? (
                <ul className="space-y-3">
                  {offer.benefits.map((benefit) => (
                    <li key={benefit} className="flex items-start gap-2">
                      <Check className="size-4 shrink-0" aria-hidden="true" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex max-w-md flex-col items-center gap-3 text-center">
        <a
          href={localizePath(
            `/account/access?${new URLSearchParams({ returnTo }).toString()}`,
          )}
          className={buttonVariants({ size: 'lg' })}
        >
          {m.candidatePaywallLock_ctaLabel()}
        </a>
        <Text variant="secondary" size="sm">
          {m.candidatePaywallLock_checkoutTerms()}
        </Text>
        {browseJobs}
      </div>
    </section>
  );
}
