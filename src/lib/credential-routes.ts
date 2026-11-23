/**
 * Pages where a visitor types a password or arrives with a one-time token in
 * the URL (reset, verification, magic link, sign-in completion, email change,
 * purchase, invite and alert links).
 * The root shell loads no third-party analytics, tag manager, ad scripts or
 * Cavuno Analytics on them: any script on the page can read the full URL and
 * the password fields.
 *
 * Matched by route id, not by pathname, so localized URLs (/nl/inloggen)
 * match too: the router delocalizes them before matching.
 */
import type { FileRoutesById } from '../routeTree.gen';

export const CREDENTIAL_ROUTE_IDS: ReadonlySet<string> = new Set([
  '/auth/confirm-email-change',
  '/auth/employer/sign-up',
  '/auth/forgot-password',
  '/auth/join',
  '/auth/magic-link',
  '/auth/oauth-complete',
  '/auth/reset-password',
  '/auth/sign-in',
  '/auth/sign-up',
  '/auth/verify-email',
  '/auth/verify-email-required',
  '/auth/verify-item-email',
  '/auth/verify-work-email',
  '/alerts/confirm',
  '/authorize',
  '/employers/invites/accept',
  '/password',
  '/purchases/$purchaseToken',
  '/settings',
] as const satisfies readonly (keyof FileRoutesById)[]);

/** True when any rendered match is a credential page. */
export function isCredentialRoute(
  matches: readonly { routeId: string }[],
): boolean {
  return matches.some((match) => CREDENTIAL_ROUTE_IDS.has(match.routeId));
}
