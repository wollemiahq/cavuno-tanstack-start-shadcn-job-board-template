/**
 * Cookie-consent preference helpers — pure (no env, no request) so the
 * banner can write the cookie from the browser and the root shell can
 * parse it on the server.
 *
 * Cookie `cavuno_cookie_consent` is consent state (`accepted` | `denied`),
 * not an auth credential: Path=/, SameSite=Lax, max-age ~13 months, not
 * httpOnly so client JS can write it. Hard rule 3 (session credentials)
 * does not apply.
 */

export type CookieConsentChoice = 'accepted' | 'denied';

export const COOKIE_CONSENT_COOKIE = 'cavuno_cookie_consent';

/** ~13 months in seconds — long-lived preference, not a session token. */
export const COOKIE_CONSENT_MAX_AGE = 13 * 30 * 24 * 60 * 60;

const CHOICE_SET = new Set<string>(['accepted', 'denied']);

/** Parse the consent preference from a Cookie header. Null if absent/invalid. */
export function parseCookieConsent(
  cookieHeader: string | null | undefined,
): CookieConsentChoice | null {
  if (!cookieHeader) return null;
  const pair = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_CONSENT_COOKIE}=`));
  if (!pair) return null;
  const value = decodeURIComponent(
    pair.slice(COOKIE_CONSENT_COOKIE.length + 1),
  );
  return CHOICE_SET.has(value) ? (value as CookieConsentChoice) : null;
}

/**
 * Serialize the consent preference as a Set-Cookie / `document.cookie` write
 * string. Not httpOnly — client JS must be able to write it.
 */
export function serializeCookieConsent(choice: CookieConsentChoice): string {
  return `${COOKIE_CONSENT_COOKIE}=${encodeURIComponent(choice)}; Path=/; Max-Age=${COOKIE_CONSENT_MAX_AGE}; SameSite=Lax`;
}

/** Clear the consent cookie (reopen preferences). */
export function clearCookieConsent(): string {
  return `${COOKIE_CONSENT_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}
