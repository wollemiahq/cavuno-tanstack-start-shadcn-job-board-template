import { BOARD_API_ERROR_CODES, isBoardApiError } from '@cavuno/board';

import { m } from '../paraglide/messages';
import { boardErrorMessage } from './board-error-message';

const KNOWN_BOARD_ERROR_CODES: ReadonlySet<string> = new Set(
  BOARD_API_ERROR_CODES,
);

function serializedBoardErrorCode<T>(error: T): string | null {
  if (error === null || error === undefined) return null;
  const descriptor = Object.getOwnPropertyDescriptor(Object(error), 'code');
  if (!descriptor) return null;
  const code = String(descriptor.value);
  return KNOWN_BOARD_ERROR_CODES.has(code) ? code : null;
}

/**
 * A user-facing string for an error caught from a messaging server function.
 * The `BoardApiError` does not survive the TanStack server-fn RPC boundary
 * (see `board-access.ts`), so the client sees a plain `Error` whose message
 * carries the server-side text — fall back to a generic line otherwise.
 */
export function errorMessage<T>(error: T): string {
  if (isBoardApiError(error)) {
    return boardErrorMessage({ code: error.code });
  }
  const serializedCode = serializedBoardErrorCode(error);
  if (serializedCode) return boardErrorMessage({ code: serializedCode });
  if (error instanceof Error && error.message.includes('EMAIL_UNVERIFIED')) {
    return m.messages_verifyEmailFirstText();
  }
  // Never render the wire's English sentence into a localized surface —
  // unknown failures get the generic line in the viewer's locale.
  return m.boardError_genericText();
}
