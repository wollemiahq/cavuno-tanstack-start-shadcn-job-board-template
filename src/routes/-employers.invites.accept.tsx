import { isRedirect, redirect } from '@tanstack/react-router';

import {
  handleEmployerLoaderError,
  isReauthRetry,
} from '../lib/employer-loader-auth';
import { m } from '../paraglide/messages';
import { acceptCompanyInvite } from '../server/employers';
import { getSeoBase } from '../server/queries';

import { Page, PageContent } from '@/components/layout/page';
import { Text } from '@/components/text';

type AcceptState =
  | { mode: 'invalid' }
  | { mode: 'wrong-email'; email?: string }
  | { mode: 'candidate-role' };

export function acceptReturnTo(token: string) {
  return token
    ? `/employers/invites/accept?token=${encodeURIComponent(token)}`
    : '/employers/invites/accept';
}

export async function loadAcceptInvite(
  deps: { token: string },
  location: Parameters<typeof isReauthRetry>[0],
  actions: {
    acceptCompanyInvite: (input: { data: { token: string } }) => Promise<
      | { ok: true; data: { companySlug: string } }
      | {
          ok: false;
          code: string;
          message: string;
          email?: string;
        }
    >;
    getSeoBase: () => Promise<{
      boardName: string;
      language: string;
      origin: string;
    }>;
    handleEmployerLoaderError: (
      error: Error,
      returnTo: string,
      options?: {
        retried?: boolean;
        incomingSearch?: string | Record<string, unknown>;
      },
    ) => Promise<never>;
  } = { acceptCompanyInvite, getSeoBase, handleEmployerLoaderError },
) {
  const seo = await actions.getSeoBase();
  if (!deps.token) {
    return { seo, token: '', state: { mode: 'invalid' } as const };
  }
  try {
    const result = await actions.acceptCompanyInvite({
      data: { token: deps.token },
    });
    if (result.ok) {
      throw redirect({
        href: `/employers/companies/${result.data.companySlug}/members?joined=1`,
      });
    }
    if (result.code === 'invite_email_mismatch' && 'email' in result) {
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
    if (isRedirect(error)) throw error;
    const failure =
      error instanceof Error
        ? error
        : new Error('Invite acceptance failed without an Error value');
    return await actions.handleEmployerLoaderError(
      failure,
      acceptReturnTo(deps.token),
      {
        retried: isReauthRetry(location),
        incomingSearch: location?.searchStr ?? location?.search,
      },
    );
  }
}

export function AcceptInviteView({
  state,
  signInLink,
}: {
  state: AcceptState;
  signInLink?: React.ReactNode;
}) {
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
          {signInLink}
        </div>
      </PageContent>
    </Page>
  );
}
