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
export const CODE_MESSAGES: Record<string, () => string> = {
  board_auth_invalid_credentials: m.boardError_invalidCredentialsText,
  board_password_invalid: m.boardError_invalidCredentialsText,
  rate_limited: m.boardError_rateLimitedText,
  board_auth_invalid_token: m.boardError_otpInvalidText,
  board_auth_token_expired: m.boardError_otpExpiredText,
  board_auth_email_taken: m.boardError_emailTakenText,
  board_auth_registration_disabled: m.boardError_registrationDisabledText,
  auth_unauthenticated: m.boardError_unauthorizedText,
  validation_bad_request: m.boardError_validationText,
  job_posting_logo_not_found: m.postJob_logoNotFoundError,
  // App-local codes (not from the SDK):
  unauthorized: m.boardError_unauthorizedText,
  invalid_file: m.postJob_chooseImageError,
};

export function boardErrorMessage(result: {
  code?: string | null;
  message?: string | null;
}): string {
  const resolve = result.code ? CODE_MESSAGES[result.code] : undefined;
  return resolve ? resolve() : m.boardError_genericText();
}
