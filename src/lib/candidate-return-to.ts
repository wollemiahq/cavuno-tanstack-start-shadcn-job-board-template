import { safeRedirectPath } from '@cavuno/board/server';

import { localizePath } from './localized-path';

const DEFAULT_CANDIDATE_RETURN_TO = '/account';

export function candidateReturnTo(value: unknown) {
  const returnTo = safeRedirectPath(
    typeof value === 'string' ? value : undefined,
    DEFAULT_CANDIDATE_RETURN_TO,
  );

  const pathname = returnTo.split(/[?#]/, 1)[0];
  if (pathname === '/auth' || pathname.startsWith('/auth/')) {
    return DEFAULT_CANDIDATE_RETURN_TO;
  }

  return returnTo;
}

export function candidateSignInHref(value: unknown) {
  return candidateAuthHref('/auth/sign-in', value);
}

export function candidateVerifyEmailHref(value: unknown) {
  return candidateAuthHref('/auth/verify-email-required', value);
}

export function candidateSignUpHref(value: unknown) {
  return candidateAuthHref('/auth/sign-up', value);
}

/**
 * The single sign-up entry point. Send users here when the role is
 * unknown — `/auth/join` resolves it via `resolveSignupDestination`, skipping
 * the chooser when the board only enables one role.
 */
export function candidateJoinHref(value: unknown) {
  return candidateAuthHref('/auth/join', value);
}

export function candidateForgotPasswordHref(value: unknown) {
  return candidateAuthHref('/auth/forgot-password', value);
}

function candidateAuthHref(pathname: string, value: unknown) {
  const search = new URLSearchParams({
    returnTo: localizePath(candidateReturnTo(value)),
  });
  return `${localizePath(pathname)}?${search}`;
}
