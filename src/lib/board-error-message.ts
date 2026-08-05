/**
 * Board API errors → viewer-locale copy. Server functions return
 * `{ code, message }` where `message` is the API's ENGLISH sentence — wire
 * text, never display copy. Resolve the display string from the stable
 * `code` here; unknown codes get the generic line rather than leaking the
 * English wire message into a localized form.
 */
import { m } from '../paraglide/messages';

const CODE_MESSAGES: Record<string, () => string> = {
  invalid_credentials: m.boardError_invalidCredentialsText,
  board_password_invalid: m.boardError_invalidCredentialsText,
  rate_limited: m.boardError_rateLimitedText,
  otp_invalid: m.boardError_otpInvalidText,
  otp_expired: m.boardError_otpExpiredText,
  unauthorized: m.boardError_unauthorizedText,
  email_taken: m.boardError_emailTakenText,
  validation_error: m.boardError_validationText,
};

export function boardErrorMessage(result: {
  code?: string | null;
  message?: string | null;
}): string {
  const resolve = result.code ? CODE_MESSAGES[result.code] : undefined;
  return resolve ? resolve() : m.boardError_genericText();
}
