import { isBoardApiError } from '@cavuno/board';
import { serializeGrantCookie } from '@cavuno/board/server';
/**
 * Board-password challenge: verify the password (storing the grant in a
 * host-owned httpOnly cookie) and convert a gated read's wall error into the
 * /password redirect.
 */
import { redirect } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { setResponseHeader } from '@tanstack/react-start/server';

import { getBoard } from '../lib/board';

import type { BoardAccessContext } from '../lib/board-access-middleware';

/**
 * Verify a board password and persist the grant as a host-owned httpOnly
 * cookie. Opaque on failure — a wrong password AND a board that isn't protected
 * both return `{ ok: false }` (the v1 endpoint 401s `board_password_invalid` in
 * both cases), so a caller can't probe protection state.
 */
export const verifyBoardPassword = createServerFn({ method: 'POST' })
  .validator((input: { password: string }) => input)
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    try {
      const grant = await getBoard().password.verify(data.password);
      setResponseHeader('Set-Cookie', serializeGrantCookie(grant.token));
      return { ok: true };
    } catch (error) {
      if (isBoardApiError(error)) return { ok: false };
      throw error;
    }
  });

/**
 * Run a gated content read with the grant header, converting the password wall
 * (401 `board_password_required`) into a redirect to the /password challenge.
 * The BoardApiError does NOT survive the server-fn RPC boundary, so the wall
 * MUST be caught here (server-side) and turned into a framework `redirect`,
 * which does survive. Anything else propagates unchanged.
 */
export async function gatedRead<T>(
  context: BoardAccessContext,
  read: (headers: Record<string, string>) => Promise<T>,
): Promise<T> {
  try {
    return await read(context.boardAccessHeaders);
  } catch (error) {
    if (isBoardApiError(error) && error.code === 'board_password_required') {
      throw redirect({
        to: '/password',
        search: { redirect: context.currentPath },
      });
    }
    throw error;
  }
}
