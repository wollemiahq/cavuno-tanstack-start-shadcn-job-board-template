import { createFileRoute, Link, redirect } from '@tanstack/react-router';

import {
  handleEmployerLoaderError,
  isReauthRetry,
} from '../lib/employer-loader-auth';
import { m } from '../paraglide/messages';
import { acceptCompanyInvite } from '../server/employers';
import { getSeoBase } from '../server/queries';

import { Page, PageContent } from '@/components/layout/page';
import { Text } from '@/components/text';
import { buttonVariants } from '@/components/ui/button';
import { headTitle } from '@/lib/page-title';

type AcceptState =
  | { mode: 'invalid' }
  | { mode: 'wrong-email'; email?: string }
  | { mode: 'candidate-role' };

function acceptReturnTo(token: string) {
  return token
    ? `/employers/invites/accept?token=${encodeURIComponent(token)}`
    : '/employers/invites/accept';
}

export const Route = createFileRoute('/employers/invites/accept')({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === 'string' ? search.token : '',
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps, location }) => {
    const seo = await getSeoBase();
    if (!deps.token) {
      return { seo, token: '', state: { mode: 'invalid' } as const };
    }
    try {
      const result = await acceptCompanyInvite({
        data: { token: deps.token },
      });
      if (result.ok) {
        throw redirect({
          href: `/employers/companies/${result.data.companySlug}/members?joined=1`,
        });
      }
      if (result.code === 'invite_email_mismatch') {
        return {
          seo,
          token: deps.token,
          state: {
            mode: 'wrong-email',
            email: result.email,
          } satisfies AcceptState,
        };
      }
      if (result.code === 'candidate_role') {
        return {
          seo,
          token: deps.token,
          state: { mode: 'candidate-role' } satisfies AcceptState,
        };
      }
      return {
        seo,
        token: deps.token,
        state: { mode: 'invalid' } satisfies AcceptState,
      };
    } catch (error) {
      return await handleEmployerLoaderError(
        error,
        acceptReturnTo(deps.token),
        { retried: isReauthRetry(location) },
      );
    }
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: headTitle(
          loaderData?.seo.boardName,
          m.employerInviteAccept_title(),
        ),
      },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  staticData: { ownsMain: true },
  component: AcceptInvitePage,
});

function AcceptInvitePage() {
  const { state, token } = Route.useLoaderData();
  const returnTo = acceptReturnTo(token);

  const title =
    state.mode === 'candidate-role'
      ? m.employerInviteAccept_candidateTitle()
      : state.mode === 'wrong-email'
        ? m.employerInviteAccept_wrongEmailTitle()
        : m.employerInviteAccept_invalidTitle();

  const body =
    state.mode === 'candidate-role'
      ? m.employerInviteAccept_candidateBody()
      : state.mode === 'wrong-email'
        ? state.email
          ? m.employerInviteAccept_wrongEmailBody({ email: state.email })
          : m.employerInviteAccept_wrongEmailTitle()
        : m.employerInviteAccept_invalidBody();

  return (
    <Page width="narrow">
      <PageContent>
        <div className="space-y-3 py-10 text-center">
          <Text as="h1" variant="heading1">
            {title}
          </Text>
          <p className="text-muted-foreground text-sm">{body}</p>
          <Link
            to="/auth/sign-in"
            search={{ returnTo }}
            className={buttonVariants({ variant: 'outline' })}
          >
            {m.employerInviteAccept_signInLabel()}
          </Link>
        </div>
      </PageContent>
    </Page>
  );
}
