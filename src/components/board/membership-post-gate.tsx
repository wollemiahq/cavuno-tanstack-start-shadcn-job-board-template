import { Suspense, lazy } from 'react';

import { Link } from '@tanstack/react-router';

import { m } from '../../paraglide/messages';

import type {
  GetMembershipCheckoutState,
  MembershipsViewer,
  StartMembershipCheckout,
} from './membership-plans';
import { buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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

export type GateProps = {
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

/** Whether the gate sells the board's memberships in place of the job form. */
export function sellsMemberships(
  offer: MembershipOffer | undefined,
): offer is MembershipOffer {
  return Boolean(offer && offer.plans.length > 0);
}

/** A page's heading and the line under it. */
// Only members-only boards that sell memberships render the plan cards and
// checkout, so they load on demand instead of riding every posting form.
const LazyMembershipJoinGate = lazy(() =>
  import('./membership-join-gate').then(({ MembershipJoinGate }) => ({
    default: MembershipJoinGate,
  })),
);

export type JoinHeading = { title: string; description: string };

/**
 * The page heading while the gate sells memberships. It replaces "Post a
 * job": the page is about joining until the poster is a member, and the
 * gate's cards follow straight on from it.
 */
export function membershipJoinHeading(boardName: string): JoinHeading {
  return {
    title: m.postGate_joinHeading(),
    description: m.postGate_joinText({ boardName }),
  };
}

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
  if (sellsMemberships(props.offer)) {
    return (
      <Suspense
        fallback={
          <div className="flex justify-center py-12">
            <Spinner className="size-6" />
          </div>
        }
      >
        <LazyMembershipJoinGate {...props} offer={props.offer} />
      </Suspense>
    );
  }
  return <MembershipLinkGate {...props} />;
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
