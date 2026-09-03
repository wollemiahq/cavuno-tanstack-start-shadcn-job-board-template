import { safeRedirectPath } from '@cavuno/board/server';

import {
  appendAuthConversionQuery,
  appendAuthIntentQuery,
  appendOAuthProviderHint,
} from './board-datalayer-events';
import { localizePath } from './localized-path';
import { searchString } from './pagination';

const DEFAULT_CANDIDATE_RETURN_TO = '/account';

export function candidateReturnTo<T>(value: T) {
  const returnTo = safeRedirectPath(
    searchString(value),
    DEFAULT_CANDIDATE_RETURN_TO,
  );

  const pathname = returnTo.split(/[?#]/, 1)[0];
  if (pathname === '/auth' || pathname.startsWith('/auth/')) {
    return DEFAULT_CANDIDATE_RETURN_TO;
  }

  return returnTo;
}

export function candidateSignInHref<T>(value: T) {
  return candidateAuthHref('/auth/sign-in', value);
}

/**
 * Search bag for TanStack `Link` auth CTAs. Pathnames stay unlocalized — the
 * router `rewrite.output` localizes the rendered href. `returnTo` stays a
 * localized absolute path so post-auth redirects survive a document load.
 */
export function candidateAuthSearch<T>(value: T) {
  return { returnTo: localizePath(candidateReturnTo(value)) };
}

/** Durable password-reset completion destination. The bounded marker is
 * display-only and contains no account or token data. */
export function candidatePasswordResetSignInHref<T>(value: T) {
  const search = new URLSearchParams({
    returnTo: localizePath(candidateReturnTo(value)),
    reset: 'password',
  });
  return `${localizePath('/auth/sign-in')}?${search}`;
}

export function candidatePasswordResetSignInSearch<T>(value: T) {
  return {
    ...candidateAuthSearch(value),
    reset: 'password' as const,
  };
}

export function candidateVerifyEmailHref<T>(value: T) {
  return candidateAuthHref('/auth/verify-email-required', value);
}

/** Password sign-up success → verify-email with `cavuno_auth*` intact. */
export function buildVerifyEmailRedirectPath<T>(value: T) {
  return appendAuthConversionQuery(
    candidateVerifyEmailHref(value),
    'sign_up',
    'password',
  );
}

export function candidateOAuthReturnTo<T>(
  value: T,
  intent: 'sign_up' | 'login',
  provider: 'google' | 'linkedin',
) {
  return appendOAuthProviderHint(
    appendAuthIntentQuery(candidateReturnTo(value), intent),
    provider,
  );
}

export function candidateSignUpHref<T>(value: T) {
  return candidateAuthHref('/auth/sign-up', value);
}

/**
 * The single sign-up entry point. Send users here when the role is
 * unknown — `/auth/join` resolves it via `resolveSignupDestination`, skipping
 * the chooser when the board only enables one role.
 */
export function candidateJoinHref<T>(value: T) {
  return candidateAuthHref('/auth/join', value);
}

export function candidateForgotPasswordHref<T>(value: T) {
  return candidateAuthHref('/auth/forgot-password', value);
}

function candidateAuthHref<T>(pathname: string, value: T) {
  const search = new URLSearchParams({
    returnTo: localizePath(candidateReturnTo(value)),
  });
  return `${localizePath(pathname)}?${search}`;
}
