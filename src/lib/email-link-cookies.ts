/**
 * The credentials an email link carries (`?token=…` and the ids that go
 * with it), kept in host-owned httpOnly cookies once a page has read them.
 * The page then drops them from the address bar, so analytics, referrers
 * and screenshots never see them, and a reload still works.
 *
 * Each link gets its own cookie, named by a random key under the page's
 * prefix, and the page's address carries only that key (`?person=` or
 * `?link=`). So a tab acts only for the person it shows, even after another
 * person's link is opened in the same browser; the key, made fresh for each
 * browser, tells analytics tags nothing about who the person is; and each
 * cookie lasts an hour from its own last use. Reopening the same link reuses
 * its key. At most a few are kept per page, so another site sending the
 * browser through junk links can't fill it with cookies until the board's
 * requests are too large to serve.
 */

/** Cookies kept at once per page; keeping another drops the oldest first. */
export const EMAIL_LINK_LIMIT = 5;

/** The cookie prefixes, one per page that email links open. */
export const EMAIL_LINK_PREFIXES = {
  emailPreferences: '__Host-cavuno_ep_',
  alertsManage: '__Host-cavuno_am_',
  settingsUnsubscribe: '__Host-cavuno_un_',
} as const;

const MAX_AGE_SECONDS = 60 * 60;
const ATTRIBUTES = 'Path=/; HttpOnly; Secure; SameSite=Lax';
const KEY = /^[0-9a-f]{16}$/;
// Real values are ~100–130 characters (ids and an HMAC).
const VALUE = /^[A-Za-z0-9._~-]{1,200}$/;

/** Whether `value` can be kept; anything else is never written. */
export function isEmailLinkValue(value: string): boolean {
  return VALUE.test(value);
}

export function isEmailLinkKey(value: string): boolean {
  return KEY.test(value);
}

/** A new random key: 16 hex characters, unrelated to the link. */
export function newEmailLinkKey(): string {
  return [...crypto.getRandomValues(new Uint8Array(8))]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

/** One page's kept links: read, keep, renew and drop by key. */
export function emailLinkCookies(prefix: string) {
  /** The kept values by key, oldest first; malformed cookies are ignored. */
  function kept(cookieHeader: string | null): Map<string, string> {
    const entries = new Map<string, string>();
    for (const part of (cookieHeader ?? '').split(';')) {
      const pair = part.trim();
      if (!pair.startsWith(prefix)) continue;
      const [key, value] = pair.slice(prefix.length).split('=');
      if (key && value && KEY.test(key) && VALUE.test(value)) {
        entries.set(key, value);
      }
    }
    return entries;
  }

  return {
    /** The value kept under this key, or null. */
    find(cookieHeader: string | null, key: string): string | null {
      return kept(cookieHeader).get(key) ?? null;
    },

    /** The key already holding this value in the browser, so it is reused. */
    keyOf(cookieHeader: string | null, value: string): string | null {
      for (const [key, keptValue] of kept(cookieHeader)) {
        if (keptValue === value) return key;
      }
      return null;
    },

    /**
     * The keys to drop before keeping a new one, oldest first (browsers send
     * cookies of the same path in the order they were made), so no more than
     * the limit are kept.
     */
    toDrop(cookieHeader: string | null): string[] {
      const keys = [...kept(cookieHeader).keys()];
      return keys.slice(0, Math.max(0, keys.length - EMAIL_LINK_LIMIT + 1));
    },

    /**
     * The `Set-Cookie` value that keeps (or renews) one value for an hour.
     * Null when either is malformed, which is never written.
     */
    keep(key: string, value: string): string | null {
      if (!KEY.test(key) || !VALUE.test(value)) return null;
      return `${prefix}${key}=${value}; Max-Age=${MAX_AGE_SECONDS}; ${ATTRIBUTES}`;
    },

    /** The `Set-Cookie` value that drops one key's value. */
    drop(key: string): string {
      return `${prefix}${key}=; Max-Age=0; ${ATTRIBUTES}`;
    },
  };
}
