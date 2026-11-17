/**
 * Server side of src/lib/email-link-cookies.ts: keeps an email link's
 * credentials in this page's cookies, and reads, renews and drops them by
 * the key the page's address carries. Server functions only, so the
 * httpOnly cookies never reach the page's scripts.
 */
import {
  appendResponseHeader,
  getRequestHeader,
} from '@tanstack/react-start/server';

import {
  emailLinkCookies,
  isEmailLinkKey,
  isEmailLinkValue,
  newEmailLinkKey,
} from '../lib/email-link-cookies';

const cookieHeader = () => getRequestHeader('cookie') ?? null;

export function emailLink(prefix: string) {
  const cookies = emailLinkCookies(prefix);

  const renew = (key: string, value: string) => {
    const cookie = cookies.keep(key, value);
    if (cookie) appendResponseHeader('Set-Cookie', cookie);
  };

  /** The value kept under `key`, or null when none is. */
  const find = (key: string | undefined): string | null =>
    key && isEmailLinkKey(key) ? cookies.find(cookieHeader(), key) : null;

  return {
    find,
    renew,

    /**
     * Keeps a link's value under the key it returns: the one already
     * holding it, else a new one, dropping the oldest past the limit. Null
     * for a malformed value, which is never kept.
     */
    keep(value: string): string | null {
      if (!isEmailLinkValue(value)) return null;
      const known = cookies.keyOf(cookieHeader(), value);
      if (!known) {
        for (const key of cookies.toDrop(cookieHeader())) {
          appendResponseHeader('Set-Cookie', cookies.drop(key));
        }
      }
      const key = known ?? newEmailLinkKey();
      renew(key, value);
      return key;
    },

    /** Drops the value kept under `key`, such as a token the API rejected. */
    drop(key: string) {
      if (isEmailLinkKey(key)) {
        appendResponseHeader('Set-Cookie', cookies.drop(key));
      }
    },

    /**
     * Runs `action` with the value kept under `key`, renewing it after it
     * succeeds. Throws when none is kept; the page then says to open the
     * email's link again.
     */
    async withValue<T>(
      key: string,
      action: (value: string) => Promise<T>,
    ): Promise<T> {
      const value = find(key);
      if (!value) throw new Error('email_link_expired');
      const result = await action(value);
      renew(key, value);
      return result;
    },
  };
}
