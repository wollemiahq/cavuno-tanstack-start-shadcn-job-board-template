/**
 * The email preferences link's token, kept in a host-owned httpOnly cookie
 * once the page has read it. The page then drops `?token` from the address
 * bar, so analytics, referrers and screenshots never see it, and a reload
 * still loads the person's preferences. It lasts an hour, renewed on each
 * read; a new link's token replaces it.
 */

export const EMAIL_PREFERENCES_COOKIE = '__Host-cavuno_email_preferences';

const MAX_AGE_SECONDS = 60 * 60;
const ATTRIBUTES = 'Path=/; HttpOnly; Secure; SameSite=Lax';
const TOKEN = /^[A-Za-z0-9._~-]{1,512}$/;

/** The token in the cookie; a malformed value reads as none. */
export function readEmailPreferencesCookie(
  cookieHeader: string | null,
): string | null {
  if (!cookieHeader) return null;
  const prefix = `${EMAIL_PREFERENCES_COOKIE}=`;
  const value = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix))
    ?.slice(prefix.length);
  return value && TOKEN.test(value) ? value : null;
}

/**
 * The `Set-Cookie` value that keeps the token. Null when the token is not a
 * plain URL-safe string, which is never written.
 */
export function serializeEmailPreferencesCookie(token: string): string | null {
  if (!TOKEN.test(token)) return null;
  return `${EMAIL_PREFERENCES_COOKIE}=${token}; Max-Age=${MAX_AGE_SECONDS}; ${ATTRIBUTES}`;
}

/** The `Set-Cookie` value that removes the token. */
export function clearEmailPreferencesCookie(): string {
  return `${EMAIL_PREFERENCES_COOKIE}=; Max-Age=0; ${ATTRIBUTES}`;
}
