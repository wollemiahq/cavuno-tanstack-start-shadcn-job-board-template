import type { BoardUser } from '@cavuno/board';

/**
 * Whether chrome links to `/memberships`. Memberships are an employer
 * product, so a signed-in job seeker never sees the link; signed-out
 * visitors and employers do whenever the board publishes a membership plan.
 */
export function membershipNavVisible(
  hasMembershipPage: boolean,
  viewerRole: BoardUser['role'] | null | undefined,
): boolean {
  return hasMembershipPage && viewerRole !== 'candidate';
}
