import { Link } from '@tanstack/react-router';

import { m } from '../../paraglide/messages';

import { buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

/**
 * The join gate that stands in for the posting form on a members-only board —
 * both the anonymous `/post` route (`context.posting.requiresMembership`) and
 * the signed-in employer flow, where the board refuses the write with
 * `membership_required`.
 *
 * Signed out on a board that publishes a membership plan, the visitor gets
 * both roads: become a member, or sign in (a member's account already carries
 * the company's membership). Without a published plan, `/memberships` 404s, so
 * the only road is sign in. Signed in, the anonymous form is the wrong surface
 * either way: a member posts from their company workspace, where the employer
 * flow knows the membership, and a non-member can still become one — but only
 * when the memberships page exists. When the board publishes a contact
 * address, a line invites the visitor to ask for access.
 */
export function MembershipPostGate({
  boardName,
  contactEmail = null,
  signedIn = false,
  hasMembershipPage = false,
  returnTo = '/post',
  showCompanyWorkspaceLink = true,
}: {
  boardName: string;
  contactEmail?: string | null;
  signedIn?: boolean;
  /**
   * Whether the board publishes a membership plan. Loader-driven like
   * Header/Footer, so "Become a member" never links to a 404.
   */
  hasMembershipPage?: boolean;
  /** Where sign-in returns the visitor — the surface that showed the gate. */
  returnTo?: string;
  /**
   * Signed-in CTA onto the employer workspace. Hide it on the employer
   * posting form itself — that visitor is already there.
   */
  showCompanyWorkspaceLink?: boolean;
}) {
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
