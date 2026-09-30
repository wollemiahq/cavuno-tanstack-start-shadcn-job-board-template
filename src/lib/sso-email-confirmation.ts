/**
 * Short-lived hint that this browser just signed in through an SSO connection
 * whose identity provider did not confirm the email. The verification page
 * uses it to explain why an organization sign-in still asks for a code. The
 * value is the board user id, so a different account signing in on the same
 * browser never inherits the explanation.
 */
export const SSO_EMAIL_UNCONFIRMED_COOKIE = 'cavuno_sso_email_unconfirmed';

/** Long enough to finish verifying, short enough not to outlive the visit. */
export const SSO_EMAIL_UNCONFIRMED_MAX_AGE = 60 * 60;

export function parseSsoEmailUnconfirmed(
  cookieHeader: string | null | undefined,
): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const [name, rawValue = ''] = part.trim().split('=', 2);
    if (name !== SSO_EMAIL_UNCONFIRMED_COOKIE || !rawValue) continue;
    try {
      return decodeURIComponent(rawValue);
    } catch {
      return null;
    }
  }
  return null;
}
