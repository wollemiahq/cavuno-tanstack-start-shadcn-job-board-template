import { m } from '../paraglide/messages';

/**
 * A user-facing string for an error caught from a messaging server function.
 * The `BoardApiError` does not survive the TanStack server-fn RPC boundary
 * (see `board-access.ts`), so the client sees a plain `Error` whose message
 * carries the server-side text — fall back to a generic line otherwise.
 */
export function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message.includes('EMAIL_UNVERIFIED')) {
    return m.messages_verifyEmailFirstText();
  }
  // Never render the wire's English sentence into a localized surface —
  // unknown failures get the generic line in the viewer's locale.
  return m.boardError_genericText();
}
