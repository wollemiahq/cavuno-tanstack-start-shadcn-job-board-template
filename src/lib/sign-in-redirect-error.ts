import { SIGN_IN_REDIRECT_ERROR_CODES } from '@cavuno/board';

import { m } from '../paraglide/messages';

type RedirectErrorCode = (typeof SIGN_IN_REDIRECT_ERROR_CODES)[number];

/**
 * `?error=` codes a Google, LinkedIn or SSO round trip lands on
 * `/auth/sign-in` (or `/auth/oauth-complete`) with → viewer-locale copy.
 * Keys are the SDK's `SIGN_IN_REDIRECT_ERROR_CODES`; the list is open, so an
 * unlisted code falls back to the generic line.
 */
export const REDIRECT_ERROR_MESSAGES = {
  oauth_cancelled: m.authSignInError_cancelledText,
  oauth_failed: m.authSignInError_failedText,
  oauth_email_unverified: m.authSignInError_emailUnverifiedText,
  role_disabled: m.authSignInError_roleDisabledText,
  sso_required: m.authSso_requiredText,
  sso_state_invalid: m.authSignInError_stateInvalidText,
  sso_cancelled: m.authSignInError_cancelledText,
  sso_failed: m.authSignInError_ssoFailedText,
  sso_connection_unavailable: m.authSignInError_connectionUnavailableText,
  sso_not_provisioned: m.authSignInError_notProvisionedText,
  sso_email_required: m.authSignInError_emailRequiredText,
  sso_account_disabled: m.authSignInError_accountDisabledText,
  sso_identity_linked_elsewhere: m.authSignInError_identityLinkedElsewhereText,
  sso_link_proof_rate_limited: m.authSignInError_linkProofRateLimitedText,
} satisfies Record<RedirectErrorCode, () => string>;

export function signInRedirectErrorMessage(code: string): string {
  const known = (SIGN_IN_REDIRECT_ERROR_CODES as readonly string[]).includes(
    code,
  );
  // SAFETY: `known` proves code is one of the SDK's listed redirect codes,
  // every one of which is a key of REDIRECT_ERROR_MESSAGES.
  return known
    ? REDIRECT_ERROR_MESSAGES[code as RedirectErrorCode]()
    : m.authSignInError_failedText();
}
