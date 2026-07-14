/**
 * The single sign-up entry-point gate (CAV-514).
 *
 * One pure map from a board's enabled roles to the href every sign-up entry
 * point routes to — the header's Sign up button and the `/auth/join` loader
 * both read it, so the routing is defined once and unit-tested here:
 *   - both roles → `/auth/join`, the two-card chooser earns its keep;
 *   - a single role → that role's form directly, skipping the chooser hop;
 *   - neither → `null`, so callers hide the entry point (registration would be
 *     refused server-side, so there is nowhere to send the user).
 *
 * Side-effect-free so the header link and the loader redirect stay consistent
 * without a router.
 */
export function resolveSignupDestination({
  candidates,
  employers,
}: {
  candidates: boolean;
  employers: boolean;
}): string | null {
  if (candidates && employers) return '/auth/join';
  if (candidates) return '/auth/sign-up';
  if (employers) return '/auth/employer/sign-up';
  return null;
}
