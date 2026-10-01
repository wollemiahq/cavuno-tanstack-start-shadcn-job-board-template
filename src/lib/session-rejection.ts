/**
 * Server-only classification of API 401s for revoked-session recovery
 * (`session-recovery.ts`, `require-session-guard.ts`). Kept out of
 * `session-decision.ts`, which `session-middleware.ts` re-exports at top
 * level: importing the SDK root from there would pull it into the client
 * bundle.
 */
import { isUnauthorized } from '@cavuno/board';

import type { BoardSession } from '@cavuno/board/server';

/**
 * 401 codes that mean the API rejected the bearer itself (revoked, rotated,
 * password changed, account deleted, or expired). Other 401s — the board
 * password gate, wrong login credentials, preview identity — say nothing
 * about the session and must never trigger a refresh.
 */
const SESSION_REJECTION_CODES: ReadonlySet<string> = new Set([
  'board_auth_invalid_token',
  'board_auth_token_expired',
  'auth_unauthenticated',
]);

/** True when an API error says the caller's session is no longer valid. */
export function isSessionRejection<E>(error: E): boolean {
  return isUnauthorized(error) && SESSION_REJECTION_CODES.has(error.code);
}

/**
 * A session-required call failed after the request's session was revoked:
 * `recovery` is that session's recovery outcome (`null` = signed out,
 * `undefined` = no recovery happened). Signed out + a 401 maps to the
 * `UNAUTHENTICATED` signal a signed-out visitor gets from the middleware.
 */
export function requiredSessionFailure<E>(
  error: E,
  recovery: BoardSession | null | undefined,
): E | Error {
  if (recovery === null && isUnauthorized(error)) {
    return new Error('UNAUTHENTICATED');
  }
  return error;
}
