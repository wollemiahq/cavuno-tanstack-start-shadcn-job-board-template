/**
 * The board requires an approved membership to post, and the caller has none —
 * `membership_required` (403) from job create and from checkout.
 *
 * Two entry points because the refusal arrives two ways: the employer server
 * functions already flatten a `BoardApiError` into `{ ok: false, code }`, while
 * an unwrapped call still throws the error itself.
 */
import { isBoardApiError } from '@cavuno/board';

export const MEMBERSHIP_REQUIRED = 'membership_required';

export function isMembershipRequiredCode(code: string): boolean {
  return code === MEMBERSHIP_REQUIRED;
}

export function isMembershipRequiredError<T>(error: T): boolean {
  return isBoardApiError(error) && error.code === MEMBERSHIP_REQUIRED;
}
