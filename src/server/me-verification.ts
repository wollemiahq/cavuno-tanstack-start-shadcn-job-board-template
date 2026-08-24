import { createMiddleware } from '@tanstack/react-start';

import { getBoard } from '../lib/board';
import { boardAccessMiddleware } from '../lib/board-access-middleware';
import { requireSessionMiddleware } from '../lib/session-middleware';

/** Freshly enforce email verification before protected `/me/*` work. */
export async function requireVerifiedBoardUser(
  headers: Record<string, string>,
) {
  const me = await getBoard().me.retrieve(undefined, { headers });
  if (!me.emailVerified) throw new Error('EMAIL_UNVERIFIED');
  return me;
}

/** Authenticated board boundary for surfaces that require a verified email. */
export const verifiedBoardUserMiddleware = createMiddleware({
  type: 'function',
})
  .middleware([requireSessionMiddleware, boardAccessMiddleware])
  .server(async ({ next, context }) => {
    await requireVerifiedBoardUser({
      ...context.authHeaders,
      ...context.boardAccessHeaders,
    });
    return next({ context });
  });
