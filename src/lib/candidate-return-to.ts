import { safeRedirectPath } from '@cavuno/board/server';

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

export function candidateForgotPasswordHref(value: unknown) {
  return candidateAuthHref('/auth/forgot-password', value);
}

function candidateAuthHref(pathname: string, value: unknown) {
  const search = new URLSearchParams({ returnTo: candidateReturnTo(value) });
  return `${pathname}?${search}`;
}
