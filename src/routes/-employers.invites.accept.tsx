import { isRedirect, redirect } from '@tanstack/react-router';

import {
  incomingAuthSearch,
  type AuthConversionSearchInput,
} from '../lib/board-datalayer-events';
import {
  handleEmployerLoaderError,
  isReauthRetry,
} from '../lib/employer-loader-auth';
import { getSessionUser } from '../server/account';
import { acceptCompanyInvite, previewCompanyInvite } from '../server/employers';
import { getSeoBase } from '../server/queries';

import {
  inviteAcceptPath,
  joinedCompanyPath,
  type InviteJoinState,
} from '@/components/employer/invite-join';
import type { UrlSearchInput } from '@/lib/pagination';
import type { CompanyMemberInvitePreview } from '@cavuno/board';

type AcceptResult =
  | { ok: true; data: { companySlug: string } }
  | { ok: false; code: string; message: string; email?: string };

export type AcceptInviteLoaderActions = {
  acceptCompanyInvite: (input: {
    data: { token: string };
  }) => Promise<AcceptResult>;
  previewCompanyInvite: (input: {
    data: { token: string };
  }) => Promise<CompanyMemberInvitePreview | null>;
  getSessionUser: () => Promise<{
    email: string;
    displayName: string | null;
  } | null>;
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
      incomingSearch?: AuthConversionSearchInput;
    },
  ) => Promise<never>;
};

const defaultActions: AcceptInviteLoaderActions = {
  acceptCompanyInvite,
  previewCompanyInvite,
  getSessionUser,
  getSeoBase,
  handleEmployerLoaderError,
};

/** The employer-loader policy's verdict that nobody is signed in. */
function isSignInRedirect<T>(error: T): boolean {
  return isRedirect(error) && error.options.to === '/auth/sign-in';
}

function unavailable(
  preview: CompanyMemberInvitePreview | null,
): InviteJoinState {
  return {
    mode: 'unavailable',
    reason: preview?.status === 'expired' ? 'expired' : 'invalid',
    company: preview?.company ?? null,
  };
}

/** A signed-out visitor: the invite itself says which door to offer. */
function signedOutState(
  preview: CompanyMemberInvitePreview | null,
): InviteJoinState {
  if (!preview || preview.status !== 'pending' || !preview.email) {
    return unavailable(preview);
  }
  const { company, email } = preview;
  if (preview.account === 'candidate') {
    return { mode: 'candidate', company, email };
  }
  if (preview.account === 'employer') {
    return { mode: 'sign-in', company, email };
  }
  return { mode: 'create-account', company, email };
}

/**
 * `/employers/invites/accept?token=…`. Signed in: accept straight away and
 * open the company (already a member counts as accepted). Signed out: read
 * the invite and offer sign-up or sign-in for the invited email. Every other
 * answer becomes one of the page's explanation states.
 */
export async function loadAcceptInvite(
  deps: { token: string },
  location: {
    search?: UrlSearchInput;
    searchStr?: string;
  },
  actions: AcceptInviteLoaderActions = defaultActions,
) {
  const seo = await actions.getSeoBase();
  const token = deps.token;
  if (!token) {
    return { seo, token: '', state: unavailable(null) };
  }

  let result: AcceptResult;
  try {
    result = await actions.acceptCompanyInvite({ data: { token } });
  } catch (error) {
    if (isRedirect(error)) throw error;
    const failure =
      error instanceof Error
        ? error
        : new Error('Invite acceptance failed without an Error value');
    // The employer policy first retries a rejected-but-live session (one
    // refresh, then `?reauth=1`); only its "go sign in" verdict means signed
    // out, which this page answers itself instead of bouncing to sign-in.
    try {
      await actions.handleEmployerLoaderError(
        failure,
        inviteAcceptPath(token),
        {
          retried: isReauthRetry(location),
          incomingSearch: incomingAuthSearch(location),
        },
      );
    } catch (verdict) {
      if (!isSignInRedirect(verdict)) throw verdict;
    }
    const preview = await actions.previewCompanyInvite({ data: { token } });
    return { seo, token, state: signedOutState(preview) };
  }

  if (result.ok) {
    throw redirect({ href: joinedCompanyPath(result.data.companySlug) });
  }

  const preview = await actions.previewCompanyInvite({ data: { token } });
  if (result.code === 'invite_email_mismatch') {
    const user = await actions.getSessionUser();
    const state: InviteJoinState = {
      mode: 'wrong-account',
      company: preview?.company ?? null,
      email: result.email ?? preview?.email ?? null,
      signedInAs: user
        ? { email: user.email, displayName: user.displayName }
        : null,
    };
    return { seo, token, state };
  }
  if (result.code === 'candidate_role') {
    const state: InviteJoinState = {
      mode: 'candidate',
      company: preview?.company ?? null,
      email: preview?.email ?? null,
    };
    return { seo, token, state };
  }
  return { seo, token, state: unavailable(preview) };
}
