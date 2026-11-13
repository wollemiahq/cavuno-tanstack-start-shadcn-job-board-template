import { Link } from '@tanstack/react-router';
import { Clock } from 'lucide-react';

import { m } from '../../paraglide/messages';
import { EmbeddedCheckout } from '../paywall/embedded-checkout';
import { MembershipPlanCard, useMembershipCheckout } from './membership-plans';

import type { GateProps, MembershipOffer } from './membership-post-gate';
import { EmptyState } from '@/components/empty-state';
import { Text } from '@/components/text';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Spinner } from '@/components/ui/spinner';

/**
 * The gate when the board sells memberships: the plan cards with their Join
 * controls, and the checkout on the same page. Its own chunk, loaded by
 * `MembershipPostGate` only on a members-only board that has plans to sell,
 * so every other board's posting form does not download the plan cards and
 * the embedded checkout.
 */
export function MembershipJoinGate({
  contactEmail = null,
  signedIn = false,
  returnTo = '/post',
  companySlug,
  offer,
}: GateProps & { offer: MembershipOffer }) {
  const flow = useMembershipCheckout({
    startCheckoutAction: offer.startCheckoutAction,
    getCheckoutStateAction: offer.getCheckoutStateAction,
    invalidate: offer.invalidate,
    continueTo: returnTo,
  });

  if (flow.kit) {
    return (
      <section data-slot="membership-post-gate" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Text as="h2" variant="heading3">
            {m.employerLanding_completePurchaseTitle()}
          </Text>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={flow.closeCheckout}
          >
            {m.employerLanding_backToPlansLabel()}
          </Button>
        </div>
        <EmbeddedCheckout
          kit={flow.kit}
          onComplete={flow.handleCheckoutComplete}
        />
      </section>
    );
  }

  if (flow.polling) {
    return (
      <Empty data-slot="membership-post-gate" className="min-h-80 border-0">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Spinner className="size-5" />
          </EmptyMedia>
          <EmptyTitle>{m.employerLanding_confirmingText()}</EmptyTitle>
          <EmptyDescription>
            {m.employerLanding_confirmingSubtitle()}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  if (flow.paymentState) {
    return (
      <EmptyState
        icon={<Clock aria-hidden="true" />}
        title={m.memberships_title()}
        description={
          flow.paymentState === 'processing'
            ? m.checkout_processingText()
            : m.checkout_failedText()
        }
        action={
          <Button onClick={flow.acknowledgePaymentState}>
            {flow.paymentState === 'processing'
              ? m.appError_retryAction()
              : m.employerLanding_backToPlansLabel()}
          </Button>
        }
      />
    );
  }

  if (flow.exhausted) {
    return (
      <EmptyState
        icon={<Clock aria-hidden="true" />}
        title={m.checkout_pendingTitle()}
        description={m.checkout_pendingText()}
        action={
          <Button onClick={flow.acknowledgeExhausted}>
            {m.employerLanding_backToPlansLabel()}
          </Button>
        }
      />
    );
  }

  return (
    <section data-slot="membership-post-gate" className="space-y-6">
      {flow.confirmed ? (
        <p role="status" className="text-foreground text-sm font-medium">
          {m.memberships_confirmedText()}
        </p>
      ) : null}
      {flow.error ? (
        <p role="alert" className="text-destructive text-sm">
          {flow.error}
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        {offer.plans.map((plan) => (
          <MembershipPlanCard
            key={plan.id}
            plan={plan}
            viewer={offer.viewer}
            busy={flow.busy === plan.id}
            onJoin={(slug) => void flow.join(plan, slug)}
            preferredCompanySlug={companySlug ?? null}
            signInReturnTo={returnTo}
          />
        ))}
      </div>
      {signedIn ? null : (
        <p className="text-muted-foreground text-sm">
          {m.postGate_alreadyMemberText()}{' '}
          <Link
            to="/auth/sign-in"
            search={{ returnTo }}
            className={buttonVariants({ variant: 'link', size: 'inline' })}
          >
            {m.postGate_signInLabel()}
          </Link>
        </p>
      )}
      {contactEmail ? (
        <p className="text-muted-foreground text-sm">
          {m.postGate_contactText({ email: contactEmail })}
        </p>
      ) : null}
    </section>
  );
}
