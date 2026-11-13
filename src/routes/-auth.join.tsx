import { useState } from 'react';

import { Link, getRouteApi } from '@tanstack/react-router';

import { m } from '../paraglide/messages';

import { AuthPageCard, RoleSelector } from '@/components/registration-page';
import { buttonVariants } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader } from '@/components/ui/empty';
import { textLinkClass } from '@/lib/text-link';
import { cn } from '@/lib/utils';

const routeApi = getRouteApi('/auth/join');

export function JoinUnavailable() {
  return (
    <div>
      <Empty className="border-border bg-card border">
        <EmptyHeader>
          <EmptyDescription>{m.authJoin_notAvailableText()}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  );
}

export function JoinPage() {
  const { boardName } = routeApi.useLoaderData();
  const { returnTo } = routeApi.useSearch();
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
      {/* Both forms carry the caller's destination through: an employer who
          came from Post a job goes back there once their company is set up. */}
      {role === 'employer' ? (
        <Link
          to="/auth/employer/sign-up"
          search={returnTo ? { returnTo } : {}}
          className={cn(buttonVariants({ size: 'lg' }), 'w-full')}
        >
          {m.authJoin_continueLabel()}
        </Link>
      ) : (
        <Link
          to="/auth/sign-up"
          search={returnTo ? { returnTo } : {}}
          className={cn(buttonVariants({ size: 'lg' }), 'w-full')}
        >
          {m.authJoin_continueLabel()}
        </Link>
      )}
      <p className="text-muted-foreground text-center text-sm">
        {m.authJoin_alreadyHaveAccountText()}{' '}
        <Link to="/auth/sign-in" className={textLinkClass}>
          {m.authJoin_logInLink()}
        </Link>
      </p>
    </AuthPageCard>
  );
}
