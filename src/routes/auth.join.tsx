import { useState } from 'react';

import { boardCopy } from '#/copy';
import { createBreadcrumbJsonLd } from '@cavuno/board/seo';
import {
  Link,
  createFileRoute,
  notFound,
  redirect,
} from '@tanstack/react-router';

import { resolveSignupDestination } from '../lib/signup-destination';
import { m } from '../paraglide/messages';
import { getBoardContext, getSeoBase } from '../server/queries';

import { JsonLd } from '@/components/json-ld';
import { RheaAuthCard, RoleSelector } from '@/components/rhea-auth-pilot';
import { buttonVariants } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader } from '@/components/ui/empty';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/auth/join')({
  loader: async () => {
    const board = await getBoardContext();
    const destination = resolveSignupDestination(board.features);
    if (destination === null) throw notFound();
    if (destination !== '/auth/join') throw redirect({ href: destination });
    const seo = await getSeoBase();
    return { boardName: board.name, seo };
  },
  head: ({ loaderData }) =>
    loaderData
      ? {
          meta: [{ title: m.authJoin_title() }],
          links: [
            {
              rel: 'canonical',
              href: `${loaderData.seo.origin}/auth/join`,
            },
          ],
        }
      : { meta: [{ title: m.authJoin_title() }] },
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
  const [role, setRole] = useState<'candidate' | 'employer'>('candidate');
  const crumbs = boardCopy(seo.language, seo.labels).breadcrumbs;
  const jsonLd = [
    createBreadcrumbJsonLd([
      { label: crumbs.home, href: seo.origin },
      { label: m.breadcrumbJsonLd_joinLabel() },
    ]),
  ].filter((entry): entry is Record<string, unknown> => entry !== null);
  const destination =
    role === 'employer' ? '/auth/employer/sign-up' : '/auth/sign-up';

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
      <Link
        to={destination}
        className={cn(buttonVariants({ size: 'lg' }), 'w-full')}
      >
        {m.authJoin_continueLabel()}
      </Link>
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
