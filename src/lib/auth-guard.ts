import { redirect } from '@tanstack/react-router';

import { getSessionUser } from '../server/account';

/**
 * Bounce an already-signed-in visitor away from an auth entry page (sign-in,
 * sign-up, join). A live session on those screens is a dead end — send them
 * where they were headed (`returnTo`) or home. Verification and token-consume
 * flows deliberately DON'T use this: those pages exist to serve a
 * signed-in-but-unverified user.
 */
export async function redirectIfAuthenticated(returnTo: string): Promise<void> {
  const user = await getSessionUser().catch(() => null);
  if (user) {
    throw redirect({ href: returnTo });
  }
}
