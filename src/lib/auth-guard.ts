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
  redirectIfSignedIn(await sessionUserOrNull(), returnTo);
}

/**
 * The session probe on its own, so a loader can run it INSIDE its parallel
 * batch. Awaiting `redirectIfAuthenticated` first put a serial round trip in
 * front of every other read on the auth entry pages; the bounce decision does
 * not depend on those reads, so it can be made after they all resolve.
 */
export function sessionUserOrNull() {
  return getSessionUser().catch(() => null);
}

/** The bounce itself, applied to an already-resolved session probe. */
export function redirectIfSignedIn(user: unknown, returnTo: string): void {
  if (user) {
    throw redirect({ href: returnTo });
  }
}
