/**
 * Email preferences links' tokens, kept in host-owned httpOnly cookies once
 * the page has read them. The page then drops `?token` from the address bar,
 * so analytics, referrers and screenshots never see it, and a reload still
 * loads the person's preferences.
 *
 * Each link's token gets its own cookie, named by a random key, and the
 * page's address carries only that key (`?person=`). So a tab acts only for
 * the person it shows, even after another person's link is opened in the
 * same browser; the key, made fresh for each browser, tells analytics tags
 * nothing about who the person is; and each cookie lasts an hour from its
 * own last use. Reopening the same link reuses its key.
 */

const PREFIX = '__Host-cavuno_ep_';
const MAX_AGE_SECONDS = 60 * 60;
const ATTRIBUTES = 'Path=/; HttpOnly; Secure; SameSite=Lax';
const KEY = /^[0-9a-f]{16}$/;
const TOKEN = /^[A-Za-z0-9._~-]{1,512}$/;

/** Whether `value` can be a link's token; anything else is never stored. */
export function isEmailPreferencesToken(value: string): boolean {
  return TOKEN.test(value);
}

export function isEmailPreferencesPerson(value: string): boolean {
  return KEY.test(value);
}

/** A new random key: 16 hex characters, unrelated to the token. */
export function newEmailPreferencesPerson(): string {
  return [...crypto.getRandomValues(new Uint8Array(8))]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

/** The kept tokens by key; malformed cookies are ignored. */
function kept(cookieHeader: string | null): Map<string, string> {
  const entries = new Map<string, string>();
  for (const part of (cookieHeader ?? '').split(';')) {
    const pair = part.trim();
    if (!pair.startsWith(PREFIX)) continue;
    const [person, token] = pair.slice(PREFIX.length).split('=');
    if (person && token && KEY.test(person) && TOKEN.test(token)) {
      entries.set(person, token);
    }
  }
  return entries;
}

/** The token kept for this person, or null. */
export function findEmailPreferencesToken(
  cookieHeader: string | null,
  person: string,
): string | null {
  return kept(cookieHeader).get(person) ?? null;
}

/** The key already holding this token in the browser, so it is reused. */
export function findEmailPreferencesPerson(
  cookieHeader: string | null,
  token: string,
): string | null {
  for (const [person, keptToken] of kept(cookieHeader)) {
    if (keptToken === token) return person;
  }
  return null;
}

/**
 * The `Set-Cookie` value that keeps (or renews) one person's token for an
 * hour. Null when either is malformed, which is never written.
 */
export function keepEmailPreferencesEntry(
  person: string,
  token: string,
): string | null {
  if (!KEY.test(person) || !TOKEN.test(token)) return null;
  return `${PREFIX}${person}=${token}; Max-Age=${MAX_AGE_SECONDS}; ${ATTRIBUTES}`;
}

/** The `Set-Cookie` value that drops one person's token. */
export function dropEmailPreferencesEntry(person: string): string {
  return `${PREFIX}${person}=; Max-Age=0; ${ATTRIBUTES}`;
}
