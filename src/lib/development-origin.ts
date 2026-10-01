/**
 * Which sign-in calls carry `developmentOrigin`.
 *
 * A frontend served from somewhere other than the board's production origin
 * (a localhost dev server, an https preview) names itself with
 * `CAVUNO_DEVELOPMENT_ORIGIN`, and the API sends the user back THERE instead
 * of to production. Provider round trips (Google, LinkedIn, SSO) accept any
 * registered development origin. Email links (magic link, registration
 * verification, password reset) accept only a loopback one: anyone can
 * request an email for anyone's address, so the API refuses to point one at
 * a public preview. For an https preview those requests omit the field, and
 * the email links point at the board's production origin as usual.
 */
const LOOPBACK_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]']);

export type DevelopmentOriginUse = 'redirect' | 'email';

/** Spread into an SDK auth call's query or body. */
export type DevelopmentOriginParam = { developmentOrigin?: string };

export function developmentOriginParam(
  origin: string | undefined,
  use: DevelopmentOriginUse,
): DevelopmentOriginParam {
  if (!origin) return {};
  if (use === 'email' && !LOOPBACK_HOSTNAMES.has(new URL(origin).hostname)) {
    return {};
  }
  return { developmentOrigin: origin };
}
