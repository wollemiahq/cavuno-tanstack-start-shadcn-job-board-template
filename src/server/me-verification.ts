import { getBoard } from '../lib/board';

/** Freshly enforce email verification before protected `/me/*` work. */
export async function requireVerifiedBoardUser(
  headers: Record<string, string>,
) {
  const me = await getBoard().me.retrieve(undefined, { headers });
  if (!me.emailVerified) throw new Error('EMAIL_UNVERIFIED');
  return me;
}
