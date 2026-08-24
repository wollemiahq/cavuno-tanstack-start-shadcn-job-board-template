import { getBoard } from '../lib/board';

/** Freshly enforce email verification before protected `/me/*` work. */
export async function requireVerifiedBoardUser(
  headers: Record<string, string>,
) {
  return requireVerifiedBoardUserUsing(
    (requestHeaders) =>
      getBoard().me.retrieve(undefined, { headers: requestHeaders }),
    headers,
  );
}

/** Dependency-explicit verification boundary for protected `/me/*` work. */
export async function requireVerifiedBoardUserUsing<
  User extends { emailVerified: boolean },
>(
  retrieve: (headers: Record<string, string>) => Promise<User>,
  headers: Record<string, string>,
) {
  const me = await retrieve(headers);
  if (!me.emailVerified) throw new Error('EMAIL_UNVERIFIED');
  return me;
}
