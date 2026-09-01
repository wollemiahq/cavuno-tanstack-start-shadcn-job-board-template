/**
 * Board API errors → viewer-locale copy. Server functions return
 * `{ code, message }` where `message` is the API's ENGLISH sentence — wire
 * text, never display copy. Resolve the display string from the stable
 * `code` here; unknown codes get the generic line rather than leaking the
 * English wire message into a localized form.
 */
import { m } from '../paraglide/messages';

/**
 * Keys are REAL BoardApiErrorCode values (BOARD_API_ERROR_CODES) plus the
 * app-local codes this repo's server fns invent ('unauthorized',
 * 'invalid_file', 'unknown'). The map-keys-are-real-codes contract is
 * pinned by board-error-message.test.ts — guessed names silently rendered
 * the generic line for every actual API failure once.
 */
export const CODE_MESSAGES = {
  board_auth_invalid_credentials: m.boardError_invalidCredentialsText,
  board_password_invalid: m.boardError_invalidCredentialsText,
  rate_limited: m.boardError_rateLimitedText,
  board_auth_invalid_token: m.boardError_otpInvalidText,
  board_auth_token_expired: m.boardError_otpExpiredText,
  board_auth_email_taken: m.boardError_emailTakenText,
  board_auth_registration_disabled: m.boardError_registrationDisabledText,
  auth_unauthenticated: m.boardError_unauthorizedText,
  auth_forbidden: m.boardError_forbiddenText,
  validation_bad_request: m.boardError_validationText,
  validation_payload_too_large: m.boardError_payloadTooLargeText,
  plan_upgrade_required: m.boardError_planUpgradeText,
  // Employer↔candidate messaging policy:
  messaging_blocked: m.boardError_messagingBlockedText,
  messaging_cold_rule: m.boardError_messagingColdRuleText,
  messaging_disabled: m.boardError_messagingDisabledText,
  messaging_not_permitted: m.boardError_messagingNotPermittedText,
  messaging_rate_limited: m.boardError_messagingRateLimitedText,
  messaging_recipient_not_found: m.boardError_messagingRecipientNotFoundText,
  messaging_recipient_not_open: m.boardError_messagingRecipientNotOpenText,
  messaging_talent_access_required:
    m.boardError_messagingTalentAccessRequiredText,
  talent_access_required: m.boardError_talentAccessRequiredText,
  talent_access_unavailable: m.boardError_talentAccessUnavailableText,
  company_required: m.boardError_companyRequiredText,
  already_on_plan: m.boardError_alreadyOnPlanText,
  stripe_not_connected: m.boardError_stripeNotConnectedText,
  // Employer dashboard / posting flow:
  employer_job_slug_taken: m.boardError_jobSlugTakenText,
  employer_jobs_quota_exceeded: m.boardError_jobsQuotaText,
  employer_payment_required: m.boardError_paymentRequiredText,
  employer_checkout_failed: m.boardError_checkoutFailedText,
  employer_company_name_taken: m.boardError_companyNameTakenText,
  employer_company_exists: m.boardError_companyNameTakenText,
  employer_company_not_found: m.boardError_companyNotFoundText,
  employer_job_not_found: m.boardError_jobNotFoundText,
  employer_not_member: m.boardError_notMemberText,
  job_posting_rejected: m.boardError_jobRejectedText,
  job_posting_logo_not_found: m.postJob_logoNotFoundError,
  job_posting_logo_lookup_unavailable: m.boardError_logoLookupUnavailableText,
  invalid_current_password: m.boardError_invalidCurrentPasswordText,
  same_email: m.boardError_sameEmailText,
  email_taken: m.settingsEmail_takenError,
  invalid_token: m.boardError_invalidTokenText,
  last_admin: m.boardError_lastAdminText,
  not_company_admin: m.boardError_notCompanyAdminText,
  company_deletion_disabled: m.boardError_companyDeletionDisabledText,
  already_member: m.employerMembers_alreadyMemberError,
  already_invited: m.employerMembers_alreadyInvitedError,
  invalid_email: m.employerMembers_invalidEmailError,
  candidate_role: m.employerInviteAccept_candidateBody,
  // App-local codes (not from the SDK):
  unauthorized: m.boardError_unauthorizedText,
  invalid_file: m.postJob_chooseImageError,
};

function codeMessage(code: string): (() => string) | undefined {
  if (!Object.prototype.hasOwnProperty.call(CODE_MESSAGES, code)) {
    return undefined;
  }
  // SAFETY: The hasOwnProperty check proves code is one of the exported
  // CODE_MESSAGES keys before indexing the inferred object.
  return CODE_MESSAGES[code as keyof typeof CODE_MESSAGES];
}

export function boardErrorMessage(result: {
  code?: string | null;
  message?: string | null;
}): string {
  const resolve = result.code ? codeMessage(result.code) : undefined;
  if (resolve) return resolve();
  const generic = m.boardError_genericText();
  // Keep the stable code so a preview/register miss is diagnosable. Never
  // interpolate `message` — that is English wire text.
  return result.code ? `${generic} (${result.code})` : generic;
}
