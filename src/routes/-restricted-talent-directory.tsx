/**
 * The employers-only talent-directory upsell surface, colocated with the
 * `/talent` route as a non-route module (leading `-`) so the route file
 * exports only `Route` and stays cleanly code-split. Rendered by the route when
 * the directory read comes back `restricted`, and imported directly by the
 * route contract test.
 */
import { LockKeyhole } from 'lucide-react';

import { m } from '../paraglide/messages';

import { Page } from '@/components/layout/page';
import { buttonVariants } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

export function RestrictedTalentDirectory({
  boardName,
  signedIn = false,
}: {
  boardName: string;
  /** A signed-in candidate needs a company, not another sign-in. */
  signedIn?: boolean;
}) {
  return (
    <Page width="wide" fill>
      <main className="min-w-0 overflow-x-clip">
        <div className="mx-auto w-full max-w-[var(--layout-width)] px-4 py-4 md:px-8">
          <Empty className="min-h-[calc(100dvh-12rem)] border-0">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <LockKeyhole aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>
                <h1>{m.talentDirectory_restrictedHeading()}</h1>
              </EmptyTitle>
              <EmptyDescription>
                {signedIn
                  ? m.talentDirectory_restrictedSignedInBody({ boardName })
                  : m.talentDirectory_restrictedBody({ boardName })}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent className="flex-row justify-center gap-2">
              {signedIn ? (
                <a
                  href="/employers/dashboard?add=true"
                  className={buttonVariants()}
                >
                  {m.employerOnboarding_addCompanyLabel()}
                </a>
              ) : (
                <>
                  <a href="/auth/employer/sign-up" className={buttonVariants()}>
                    {m.siteHeader_signUpLabel()}
                  </a>
                  <a
                    href="/auth/sign-in"
                    className={buttonVariants({ variant: 'outline' })}
                  >
                    {m.talentDirectory_signInLabel()}
                  </a>
                </>
              )}
            </EmptyContent>
          </Empty>
        </div>
      </main>
    </Page>
  );
}
