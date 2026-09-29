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
  if (!Object.prototype.hasOwnProperty.call(REDIRECT_ERROR_MESSAGES, code)) {
    return m.authSignInError_failedText();
  }
  // SAFETY: The hasOwnProperty check proves code is one of the
  // REDIRECT_ERROR_MESSAGES keys before indexing the object.
  return REDIRECT_ERROR_MESSAGES[code as RedirectErrorCode]();
}
