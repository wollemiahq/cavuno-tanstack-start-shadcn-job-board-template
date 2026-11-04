/**
 * The public badge's domain line, when it was verified by email domain. Kept
 * apart from the item verification view model so the public profile does not
 * load the worker's verification controls.
 */
export function verificationBadge(
  badge: { status: 'verified'; verifiedDomain: string | null } | undefined,
): { verifiedDomain: string | null } | null {
  return badge?.status === 'verified'
    ? { verifiedDomain: badge.verifiedDomain }
    : null;
}
