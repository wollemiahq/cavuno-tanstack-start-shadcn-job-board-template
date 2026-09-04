import { isUnauthorized } from '@cavuno/board';
import { isRedirect, redirect } from '@tanstack/react-router';

import { refreshSession } from '../server/auth';
import { EMPLOYER_NOT_MEMBER } from '../server/board-access';
import {
  mergeAuthConversionSearch,
  type AuthConversionSearchInput,
} from './board-datalayer-events';

import type { UrlSearchInput } from './pagination';

export type RefreshSession = () => Promise<{ ok: boolean }>;

export type EmployerLoaderAuthOptions = {
  retried?: boolean;
  incomingSearch?: AuthConversionSearchInput;
};

/** The employer dashboard, which lists the caller's companies and their state. */
const EMPLOYER_DASHBOARD = '/employers/dashboard';

/**
 * The caller is signed in but holds no approved membership of `:slug` — the
 * company claim is still awaiting work-email verification or operator
 * approval. Not an auth failure, so sign-in is the wrong destination, and not
 * a fault, so the root error boundary is the wrong surface.
 *
 * `gatedRead` translates the API's `employer_not_member` into this sentinel
 * server-side, where the structured error still exists. Matching the API's
 * English message here instead would couple this repo to a default parameter
 * another repo is free to reword, with nothing to catch the break.
 */
function isNotApprovedMember<T>(error: T): boolean {
  return error instanceof Error && error.message.includes(EMPLOYER_NOT_MEMBER);
}

/** Whether the loader is already the one-shot retry after a session refresh. */
export function isReauthRetry(location?: { search?: UrlSearchInput }): boolean {
  const search = location?.search ?? {};
  return search.reauth === '1' || search.reauth === 1 || search.reauth === true;
}

/**
 * Loader error policy for the authenticated employer surfaces.
 *
 * A transient access-token rejection (the API 401s a token the client still
 * believes is live) shouldn't bounce a signed-in employer to sign-in. So on an
 * unauthorized error we FIRST attempt one forced session refresh and, when it
 * succeeds, reload the same page (`?reauth=1` bounds it to a single retry so a
 * genuinely-dead session can't loop). Only a failed refresh — or an
 * already-retried load — falls through to `/auth/sign-in`.
 */
export async function handleEmployerLoaderError<T>(
  error: T,
  returnTo: string,
  options?: EmployerLoaderAuthOptions,
): Promise<never> {
  return handleEmployerLoaderErrorUsing(
    refreshSession,
    error,
    returnTo,
    options,
  );
}

/** Dependency-explicit policy for callers that need an isolated refresh seam. */
export async function handleEmployerLoaderErrorUsing<T>(
  refresh: RefreshSession,
  error: T,
  returnTo: string,
  options?: EmployerLoaderAuthOptions,
): Promise<never> {
  if (isRedirect(error)) throw error;

  // The dashboard is the one company-scoped surface that cannot raise this,
  // and it already shows each company's claim state ("Verify work email"), so
  // it is both a safe and a useful destination.
  if (isNotApprovedMember(error) && returnTo !== EMPLOYER_DASHBOARD) {
    throw redirect({ to: EMPLOYER_DASHBOARD });
  }

  if (error instanceof Error && error.message.includes('EMAIL_UNVERIFIED')) {
    throw redirect({
      to: '/auth/verify-email-required',
      search: mergeAuthConversionSearch({ returnTo }, options?.incomingSearch),
    });
  }

  if (
    isUnauthorized(error) ||
    (error instanceof Error && error.message.includes('UNAUTHENTICATED'))
  ) {
    if (!options?.retried) {
      let refreshed = false;
      try {
        refreshed = (await refresh()).ok;
      } catch {
        refreshed = false;
      }
      if (refreshed) {
        throw redirect({
          href: `${returnTo}${returnTo.includes('?') ? '&' : '?'}reauth=1`,
        });
      }
    }
    throw redirect({
      to: '/auth/sign-in',
      search: { returnTo },
    });
  }

  throw error;
}
