/**
 * The board refuses a candidate feature the viewer's job-seeker plan does not
 * unlock — HTTP 403 with `candidate_paywall_access_required` from
 * `GET /me/recommended-jobs` and the `/me/alerts` reads and writes.
 *
 * Entitlements are per plan and are NOT on the wire, so there is nothing in
 * `board.context()` to pre-gate on: the call is made and the refusal is
 * handled. `BOARD_API_ERROR_CODES` does not carry this code yet (4.21.0 adds
 * it), which is why the comparison widens `code` to `string` rather than
 * narrowing against the published union — a literal outside the union would
 * otherwise be rejected as an unintentional comparison.
 */
import { isBoardApiError, type BoardApiError } from '@cavuno/board';

/** The wire code, exactly as the API sends it. */
export const CANDIDATE_PAYWALL_ACCESS_REQUIRED =
  'candidate_paywall_access_required';

/**
 * The signal a server function rethrows so the refusal survives the
 * server-function boundary, where the `BoardApiError` class identity does not.
 * Same shape as the `UNAUTHENTICATED` / `EMAIL_UNVERIFIED` signals the
 * candidate loaders already read.
 */
export const CANDIDATE_PAYWALL_SIGNAL = 'CANDIDATE_PAYWALL_ACCESS_REQUIRED';

/** A `BoardApiError` narrowed to this refusal. */
export type CandidatePaywallAccessError = BoardApiError;

export function isCandidatePaywallAccessError<T>(
  error: T,
): error is T & CandidatePaywallAccessError {
  if (!isBoardApiError(error) || error.status !== 403) return false;
  const code: string = error.code;
  return code === CANDIDATE_PAYWALL_ACCESS_REQUIRED;
}

/**
 * Rethrow the refusal as the boundary signal, and everything else untouched.
 * Server functions call this so a loader can tell "your plan does not include
 * this" apart from "you are signed out".
 */
export function throwCandidatePaywallSignal<T>(error: T): never {
  if (isCandidatePaywallAccessError(error)) {
    throw new Error(CANDIDATE_PAYWALL_SIGNAL);
  }
  throw error;
}
