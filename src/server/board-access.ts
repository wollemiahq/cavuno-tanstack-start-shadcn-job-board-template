import { isBoardApiError } from '@cavuno/board';
/**
 * Board-password challenge: verify the password (storing the grant in a
 * host-owned httpOnly cookie scoped to the active data source) and convert a
 * gated read's wall error into the /password redirect.
 */
import { redirect } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { setResponseHeader } from '@tanstack/react-start/server';

import { getBoard } from '../lib/board';
import {
  getDataSource,
  serializeGrantForSource,
} from '../lib/data-source.server';

import type { BoardAccessContext } from '../lib/board-access-middleware';

/**
 * Verify a board password and persist the grant as a host-owned httpOnly
 * cookie for the **active data source** only (dual-source: primary and demo
 * grants are isolated by cookie name, same as sessions). Opaque on failure —
 * a wrong password AND a board that isn't protected both return `{ ok: false }`
 * (the v1 endpoint 401s `board_password_invalid` in both cases), so a caller
 * can't probe protection state.
 */
export const verifyBoardPassword = createServerFn({ method: 'POST' })
  .validator((input: { password: string }) => input)
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    try {
      const grant = await getBoard().password.verify(data.password);
      setResponseHeader(
        'Set-Cookie',
        serializeGrantForSource(grant.token, getDataSource()),
      );
      return { ok: true };
    } catch (error) {
      if (isBoardApiError(error)) return { ok: false };
      throw error;
    }
  });

/**
 * The caller holds no approved membership of the company they asked for —
 * `employer_not_member` (403). Re-thrown as an app-owned sentinel because the
 * `BoardApiError` shape does not survive the RPC boundary and the API's message
 * is a default parameter another repo is free to reword. Read by
 * `employer-loader-auth.ts`, same as `EMAIL_UNVERIFIED`.
 */
export const EMPLOYER_NOT_MEMBER = 'EMPLOYER_NOT_MEMBER';

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
    // Same boundary problem, different answer: the destination depends on the
    // route that asked, so this becomes a sentinel here and a redirect there.
    if (isBoardApiError(error) && error.code === 'employer_not_member') {
      throw new Error(EMPLOYER_NOT_MEMBER);
    }
    throw error;
  }
}
