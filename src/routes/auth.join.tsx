import { useState } from 'react';

import {
  Link,
  createFileRoute,
  notFound,
  redirect,
} from '@tanstack/react-router';

import { redirectIfSignedIn, sessionUserOrNull } from '../lib/auth-guard';
import {
  candidateReturnTo,
  candidateSignUpHref,
} from '../lib/candidate-return-to';
import { resolveSignupDestination } from '../lib/signup-destination';
import { m } from '../paraglide/messages';
import { getAuthJoinSeo } from '../server/marketing-pages';
import { getBoardContext } from '../server/queries';

import { jsonLdHeadScripts } from '@/components/json-ld';
import { AuthPageCard, RoleSelector } from '@/components/registration-page';
import { buttonVariants } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader } from '@/components/ui/empty';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/auth/join')({
  // The key is omitted rather than set to `undefined` when absent, so a
  // `search={{}}` link stays a clean `/auth/join` with no trailing `?`.
  validateSearch: (search: Record<string, unknown>): { returnTo?: string } =>
    typeof search.returnTo === 'string' && search.returnTo
      ? { returnTo: candidateReturnTo(search.returnTo) }
      : {},
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    // One wave: the session probe, the board context and the join SEO are
    // mutually independent. A board that gates or redirects away discards the
    // SEO it fetched — rare, and cheaper than serializing three round trips
    // on every visit to a signup entry page.
    const [user, board, joinSeo] = await Promise.all([
      sessionUserOrNull(),
      getBoardContext(),
      getAuthJoinSeo(),
    ]);
    redirectIfSignedIn(user, candidateReturnTo(deps.returnTo));
    const destination = resolveSignupDestination(board.features);
    if (destination === null) throw notFound();
    if (destination !== '/auth/join') {
      // Carry the caller's destination through the gate. Only the candidate
      // form takes a returnTo; the employer form has no candidate context.
      throw redirect({
        href:
          destination === '/auth/sign-up'
            ? candidateSignUpHref(deps.returnTo)
            : destination,
      });
    }
    return { boardName: board.name, ...joinSeo };
  },
  head: ({ loaderData, match }) =>
    loaderData
      ? { ...loaderData.head, scripts: jsonLdHeadScripts(loaderData.jsonLd) }
      : {
          meta: [
            {
              // A board with signup disabled throws notFound() here, and the
              // head still runs — so without this the 404 would advertise a
              // join page that does not exist.
              title:
                match.status === 'notFound'
                  ? m.notFound_heading()
                  : m.authJoin_title(),
            },
          ],
        },
  component: JoinPage,
  notFoundComponent: () => (
    <div>
      <Empty className="border-border bg-card border">
        <EmptyHeader>
          <EmptyDescription>{m.authJoin_notAvailableText()}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  ),
});

function JoinPage() {
  const { boardName } = Route.useLoaderData();
  const { returnTo } = Route.useSearch();
  const [role, setRole] = useState<'candidate' | 'employer'>('candidate');
  return (
    <AuthPageCard
      title={m.authJoin_heading({ boardName })}
      supportingText={m.authJoin_subheading()}
    >
      <RoleSelector
        value={role}
        onValueChange={setRole}
        ariaLabel={m.authJoin_subheading()}
        candidateTitle={m.authJoin_candidateCardTitle()}
        candidateBody={m.authJoin_candidateCardBody()}
        employerTitle={m.authJoin_employerCardTitle()}
        employerBody={m.authJoin_employerCardBody()}
      />
      {/* The candidate form carries the caller's destination through; the
          employer form has no candidate returnTo to honour. */}
      {role === 'employer' ? (
        <Link
          to="/auth/employer/sign-up"
          className={cn(buttonVariants({ size: 'lg' }), 'w-full')}
        >
          {m.authJoin_continueLabel()}
        </Link>
      ) : (
        <Link
          to="/auth/sign-up"
          search={{ returnTo }}
          className={cn(buttonVariants({ size: 'lg' }), 'w-full')}
        >
          {m.authJoin_continueLabel()}
        </Link>
      )}
      <p className="text-muted-foreground text-center text-sm">
        {m.authJoin_alreadyHaveAccountText()}{' '}
        <Link
          to="/auth/sign-in"
          search={{ returnTo: undefined }}
          className={buttonVariants({ variant: 'link', size: 'sm' })}
        >
          {m.authJoin_logInLink()}
        </Link>
      </p>
    </AuthPageCard>
  );
}
