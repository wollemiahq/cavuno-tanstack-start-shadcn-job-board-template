import { useState } from 'react';

import { boardCopy } from '#/copy';

import { createBreadcrumbJsonLd } from '@cavuno/board/seo';
import {
  Link,
  createFileRoute,
  notFound,
  redirect,
} from '@tanstack/react-router';

import { redirectIfAuthenticated } from '../lib/auth-guard';
import {
  candidateReturnTo,
  candidateSignUpHref,
} from '../lib/candidate-return-to';
import { resolveSignupDestination } from '../lib/signup-destination';
import { m } from '../paraglide/messages';
import { getBoardContext, getSeoBase } from '../server/queries';

import { JsonLd } from '@/components/json-ld';
import { RheaAuthCard, RoleSelector } from '@/components/rhea-auth-pilot';
import { buttonVariants } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader } from '@/components/ui/empty';
import { headTitle } from '@/lib/page-title';
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
    await redirectIfAuthenticated(candidateReturnTo(deps.returnTo));
    const board = await getBoardContext();
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
    const seo = await getSeoBase();
    return { boardName: board.name, seo };
  },
  head: ({ loaderData, match }) =>
    loaderData
      ? {
          meta: [
            { title: headTitle(loaderData?.seo.boardName, m.authJoin_title()) },
          ],
          links: [
            {
              rel: 'canonical',
              href: `${loaderData.seo.origin}/auth/join`,
            },
          ],
        }
      : {
          meta: [
            {
              // A board with signup disabled throws notFound() here, and the
              // head still runs — so without this the 404 would advertise a
              // join page that does not exist.
              title: headTitle(
                undefined,
                match.status === 'notFound'
                  ? m.notFound_heading()
                  : m.authJoin_title(),
              ),
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
  const { boardName, seo } = Route.useLoaderData();
  const { returnTo } = Route.useSearch();
  const [role, setRole] = useState<'candidate' | 'employer'>('candidate');
  const crumbs = boardCopy(seo.language, seo.labels).breadcrumbs;
  const jsonLd = [
    createBreadcrumbJsonLd([
      { label: crumbs.home, href: seo.origin },
      { label: m.breadcrumbJsonLd_joinLabel() },
    ]),
  ].filter((entry): entry is Record<string, unknown> => entry !== null);
  return (
    <RheaAuthCard
      title={m.authJoin_heading({ boardName })}
      supportingText={m.authJoin_subheading()}
    >
      <JsonLd data={jsonLd} />
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
    </RheaAuthCard>
  );
}
