import { Link } from '@tanstack/react-router';
import { Clock } from 'lucide-react';

import { m } from '../../paraglide/messages';
import { EmbeddedCheckout } from '../paywall/embedded-checkout';
import {
  MembershipPlanCard,
  useMembershipCheckout,
  type GetMembershipCheckoutState,
  type MembershipsViewer,
  type StartMembershipCheckout,
} from './membership-plans';

import { EmptyState } from '@/components/empty-state';
import { Text } from '@/components/text';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import type { Plan } from '@cavuno/board';

/**
 * What the gate needs to sell the board's memberships where it stands in for
 * the job form: the plans, who is looking, and the checkout calls.
 */
export type MembershipOffer = {
  plans: Plan[];
  viewer: MembershipsViewer;
  startCheckoutAction?: StartMembershipCheckout;
  getCheckoutStateAction?: GetMembershipCheckoutState;
  invalidate?: () => Promise<void>;
};

type GateProps = {
  boardName: string;
  contactEmail?: string | null;
  signedIn?: boolean;
  /**
   * Whether the board publishes a membership plan. Loader-driven like
   * Header/Footer, so "Become a member" never links to a 404.
   */
  hasMembershipPage?: boolean;
  /**
   * The surface that showed the gate: where sign-in returns the visitor, and
   * where a joiner continues once the membership is active.
   */
  returnTo?: string;
  /** The company the visitor would join for, preselected when they manage it. */
  companySlug?: string;
  /**
   * Signed-in CTA onto the employer workspace. Hide it on the employer
   * posting form itself — that visitor is already there.
   */
  showCompanyWorkspaceLink?: boolean;
  /**
   * The board's memberships, sold in place of the job form. Without plans
   * (none published, or the read failed) the gate links out instead.
   */
  offer?: MembershipOffer;
};

/**
 * The join gate that stands in for the posting form on a members-only board —
 * both the anonymous `/post` route (`context.posting.requiresMembership`) and
 * the company job form, when the company can't post here yet.
 *
 * When the board sells memberships, the gate is where a poster buys one: the
 * plan cards with their Join controls, and the checkout on the same page. A
 * signed-out visitor joins through sign-in, which brings them back here. Once
 * the membership is active the page re-reads, and the company's job form
 * replaces the gate.
 *
 * Without memberships to sell, it is the short card: become a member when the
 * memberships page exists, sign in, or ask the board for access.
 */
export function MembershipPostGate(props: GateProps) {
  if (props.offer && props.offer.plans.length > 0) {
    return <MembershipJoinGate {...props} offer={props.offer} />;
  }
  return <MembershipLinkGate {...props} />;
}

function MembershipJoinGate({
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
      <div className="space-y-1">
        <Text as="h2" variant="heading3" dir="auto">
          {m.postGate_joinHeading()}
        </Text>
        <p className="text-muted-foreground" dir="auto">
          {m.postGate_joinText()}
        </p>
      </div>
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

/**
 * Signed out on a board that publishes a membership plan, the visitor gets
 * both roads: become a member, or sign in (a member's account already carries
 * the company's membership). Without a published plan, `/memberships` 404s, so
 * the only road is sign in. Signed in, the anonymous form is the wrong surface
 * either way: a member posts from their company workspace, where the employer
 * flow knows the membership, and a non-member can still become one — but only
 * when the memberships page exists. When the board publishes a contact
 * address, a line invites the visitor to ask for access.
 */
function MembershipLinkGate({
  boardName,
  contactEmail = null,
  signedIn = false,
  hasMembershipPage = false,
  returnTo = '/post',
  companySlug,
  showCompanyWorkspaceLink = true,
}: GateProps) {
  return (
    <Card data-slot="membership-post-gate">
      <CardHeader>
        <CardTitle>
          <h2 dir="auto">{boardName}</h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-muted-foreground">{m.postGate_bodyText()}</p>
        {contactEmail ? (
          <p className="text-muted-foreground text-sm">
            {m.postGate_contactText({ email: contactEmail })}
          </p>
        ) : null}
      </CardContent>
      <CardFooter className="flex flex-wrap gap-3">
        {signedIn && showCompanyWorkspaceLink ? (
          <Link to="/employers/dashboard" className={cn(buttonVariants())}>
            {m.postGate_postAsCompanyLabel()}
          </Link>
        ) : null}
        {hasMembershipPage ? (
          <Link
            to="/memberships"
            search={{ company: companySlug, returnTo }}
            className={cn(
              signedIn
                ? buttonVariants({ variant: 'outline' })
                : buttonVariants(),
            )}
          >
            {m.postGate_becomeMemberLabel()}
          </Link>
        ) : null}
        {signedIn ? null : (
          <Link
            to="/auth/sign-in"
            search={{ returnTo }}
            className={cn(
              buttonVariants({
                variant: hasMembershipPage ? 'outline' : 'default',
              }),
            )}
          >
            {m.postGate_signInLabel()}
          </Link>
        )}
      </CardFooter>
    </Card>
  );
}
