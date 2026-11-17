/**
 * Email preferences links' tokens, kept in ONE host-owned httpOnly cookie
 * once the page has read them. The page then drops `?token` from the address
 * bar, so analytics, referrers and screenshots never see it, and a reload
 * still loads the person's preferences.
 *
 * Each token is kept under a short SHA-256 fingerprint of it, and the page's
 * address carries only that fingerprint (`?person=`). A tab acts only for
 * the person it shows: two people's links opened in one browser each keep
 * their own entry. The token itself is never written into the cookie's name
 * or the address. The cookie lasts an hour, renewed on each use, and holds a
 * few entries, dropping the oldest first.
 */

export const EMAIL_PREFERENCES_COOKIE = '__Host-cavuno_email_preferences';

/** Entries kept; at ~120 bytes each the cookie stays well under 4 KB. */
export const EMAIL_PREFERENCES_LIMIT = 5;

const MAX_AGE_SECONDS = 60 * 60;
const ATTRIBUTES = 'Path=/; HttpOnly; Secure; SameSite=Lax';
const FINGERPRINT = /^[0-9a-f]{16}$/;
const TOKEN = /^[A-Za-z0-9._~-]{1,512}$/;

type Entry = { person: string; token: string };

/** First 16 hex chars of the SHA-256 of the token: names it, can't be used. */
export async function emailPreferencesPerson(token: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(token),
  );
  return [...new Uint8Array(digest)]
    .slice(0, 8)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export function isEmailPreferencesPerson(value: string): boolean {
  return FINGERPRINT.test(value);
}

/** The cookie's entries; a malformed or tampered value reads as empty. */
function parse(cookieHeader: string | null): Entry[] {
  if (!cookieHeader) return [];
  const prefix = `${EMAIL_PREFERENCES_COOKIE}=`;
  const pair = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));
  if (!pair) return [];
  let raw: string;
  try {
    raw = decodeURIComponent(pair.slice(prefix.length));
  } catch {
    return [];
  }
  const entries: Entry[] = [];
  for (const part of raw.split(',')) {
    const [person, token] = part.split(':');
    if (person && token && FINGERPRINT.test(person) && TOKEN.test(token)) {
      entries.push({ person, token });
    }
  }
  return entries.slice(-EMAIL_PREFERENCES_LIMIT);
}

function serialize(entries: Entry[]): string {
  if (entries.length === 0) {
    return `${EMAIL_PREFERENCES_COOKIE}=; Max-Age=0; ${ATTRIBUTES}`;
  }
  const value = entries
    .map((entry) => `${entry.person}:${entry.token}`)
    .join(',');
  return `${EMAIL_PREFERENCES_COOKIE}=${encodeURIComponent(value)}; Max-Age=${MAX_AGE_SECONDS}; ${ATTRIBUTES}`;
}

/** The token kept for this person, or null. */
export function findEmailPreferencesToken(
  cookieHeader: string | null,
  person: string,
): string | null {
  return (
    parse(cookieHeader).find((entry) => entry.person === person)?.token ?? null
  );
}

/**
 * The `Set-Cookie` value after keeping (or renewing) one person's token, as
 * the newest entry. Null when the token is not a plain URL-safe string,
 * which is never written.
 */
export function keepEmailPreferencesEntry(
  cookieHeader: string | null,
  person: string,
  token: string,
): string | null {
  if (!FINGERPRINT.test(person) || !TOKEN.test(token)) return null;
  const kept = parse(cookieHeader).filter((entry) => entry.person !== person);
  return serialize(
    [...kept, { person, token }].slice(-EMAIL_PREFERENCES_LIMIT),
  );
}

/** The `Set-Cookie` value after dropping one person's token. */
export function dropEmailPreferencesEntry(
  cookieHeader: string | null,
  person: string,
): string {
  return serialize(
    parse(cookieHeader).filter((entry) => entry.person !== person),
  );
}
