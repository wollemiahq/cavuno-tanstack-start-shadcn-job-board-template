/** `/auth/oauth-complete` search contract and loader. Kept apart from the
 * page components so the route's always-loaded code stays small. */
import { parseOAuthCompletion } from '@cavuno/board';
import { redirect } from '@tanstack/react-router';

import { resolvePostAuthConversionRedirect } from '../lib/board-datalayer-events';
import { candidateReturnTo } from '../lib/candidate-return-to';
import { exchangeOAuth } from '../server/auth';
import { getSeoBase } from '../server/queries';

import type { SignedInBoardUser } from '../lib/resume-onboarding';
import { searchString, type UrlSearchInput } from '@/lib/pagination';

/** The completion query the API redirects here with. Every field is opaque
 * text; `parseOAuthCompletion` decides what the page does with it. */
export interface OAuthCompleteSearch {
  token?: string;
  method?: string;
  role?: string;
  isNew?: string;
  status?: string;
  linkProof?: string;
  linkProofBinding?: string;
  error?: string;
  returnTo: string;
}

const COMPLETION_KEYS = [
  'token',
  'method',
  'role',
  'isNew',
  'status',
  'linkProof',
  'linkProofBinding',
  'error',
] as const;

export function validateOAuthCompleteSearch(
  search: UrlSearchInput,
): OAuthCompleteSearch {
  const validated: OAuthCompleteSearch = {
    returnTo: candidateReturnTo(search.returnTo),
  };
  for (const key of COMPLETION_KEYS) {
    const value = searchString(search[key]);
    if (value) validated[key] = value;
  }
  return validated;
}

export type OAuthCompleteState =
  | { status: 'missing-token' }
  | { status: 'invalid' }
  | { status: 'error'; error: string }
  | { status: 'link-proof-sent'; linkProofBinding: string }
  | { status: 'link-proof'; linkProof: string };

export async function loadOAuthComplete(
  deps: OAuthCompleteSearch,
  actions: {
    exchangeOAuth: (input: {
      data: { token: string; method?: 'sso' };
    }) => Promise<
      | { ok: true; isNewUser: boolean; boardUser: SignedInBoardUser }
      | { ok: false; message: string }
    >;
    getSeoBase: () => ReturnType<typeof getSeoBase>;
  } = { exchangeOAuth, getSeoBase },
) {
  const seoPromise = actions.getSeoBase();
  const completion = parseOAuthCompletion({ ...deps });
  switch (completion.kind) {
    case 'token': {
      const [result, seo] = await Promise.all([
        actions.exchangeOAuth({
          data:
            completion.method === 'sso'
              ? { token: completion.token, method: 'sso' }
              : { token: completion.token },
        }),
        seoPromise,
      ]);
      if (!result.ok) return { status: 'invalid' as const, seo };
      throw redirect({
        href: resolvePostAuthConversionRedirect(deps.returnTo, {
          isNewUser: result.isNewUser,
          fallbackMethod: completion.method === 'sso' ? 'sso' : 'google',
          boardUser: result.boardUser,
        }),
      });
    }
    // The binding and the proof pair up in this browser's storage, so both
    // steps finish in the component rather than on the server.
    case 'link_proof_sent':
      return {
        status: 'link-proof-sent' as const,
        linkProofBinding: completion.linkProofBinding,
        seo: await seoPromise,
      };
    case 'link_proof':
      return {
        status: 'link-proof' as const,
        linkProof: completion.linkProof,
        seo: await seoPromise,
      };
    case 'error':
      return {
        status: 'error' as const,
        error: completion.error,
        seo: await seoPromise,
      };
    case 'invalid':
      return { status: 'missing-token' as const, seo: await seoPromise };
  }
}
