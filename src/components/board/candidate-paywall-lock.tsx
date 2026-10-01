import { Link } from '@tanstack/react-router';
import { ArrowRight, Check, Lock } from 'lucide-react';

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
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

/** Configured plan details describe the offer; the board's 403 owns access. */
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
    <Link to="/jobs" className={buttonVariants({ variant: 'link' })}>
      {m.accountAccess_browseJobsLink()}
    </Link>
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
    <section className="flex flex-col items-center gap-6 py-4">
      <header className="flex max-w-lg flex-col gap-2 text-center">
        <Text as="h1" variant="heading2">
          {title}
        </Text>
        <Text variant="secondary" size="sm">
          {m.candidatePaywallLock_description()}
        </Text>
      </header>

      <div
        className={cn(
          'grid w-full gap-4',
          offers.length === 1 ? 'max-w-lg' : 'max-w-4xl sm:grid-cols-2',
          offers.length > 2 && 'lg:grid-cols-3',
        )}
      >
        {offers.map((offer) => (
          <Card key={offer.offerKey} role="group" aria-label={offer.label}>
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
            <CardContent className="flex flex-1 flex-col gap-5">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <Text as="p" variant="heading1">
                  {new Intl.NumberFormat(locale, {
                    style: 'currency',
                    currency: offer.currency.toUpperCase(),
                  }).format(offer.amountCents / 100)}
                </Text>
                <Text as="span" variant="secondary" size="sm">
                  {offerBillingLabel(offer)}
                </Text>
              </div>
              {offer.benefits && offer.benefits.length > 0 ? (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <Text variant="body" size="sm" bold>
                      {m.candidatePaywallLock_includedLabel()}
                    </Text>
                    <ul className="space-y-2">
                      {offer.benefits.map((benefit) => (
                        <li key={benefit} className="flex items-start gap-2">
                          <Check
                            className="size-4 shrink-0"
                            aria-hidden="true"
                          />
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              ) : null}
            </CardContent>
            <CardFooter>
              <Link
                to="/account/access"
                search={{ offerKey: offer.offerKey, returnTo }}
                className={cn(buttonVariants({ size: 'lg' }), 'w-full')}
              >
                {m.candidatePaywallLock_ctaLabel()}
                <ArrowRight aria-hidden="true" />
              </Link>
            </CardFooter>
          </Card>
        ))}
      </div>

      {browseJobs}
    </section>
  );
}
