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

/**
 * How a page's link credentials are written to and read from one cookie
 * value. `encode` returns null for credentials that are malformed, which
 * are never kept; `decode` returns null for a value it can't read.
 */
export interface EmailLinkCodec<T> {
  encode: (value: T) => string | null;
  decode: (raw: string) => T | null;
}

const cookieHeader = () => getRequestHeader('cookie') ?? null;

export function emailLink<T>(prefix: string, codec: EmailLinkCodec<T>) {
  const cookies = emailLinkCookies(prefix);

  /** The raw value kept under `key`, or null when none is. */
  const findRaw = (key: string | undefined): string | null =>
    key && isEmailLinkKey(key) ? cookies.find(cookieHeader(), key) : null;

  const keepRaw = (key: string, raw: string) => {
    const cookie = cookies.keep(key, raw);
    if (cookie) appendResponseHeader('Set-Cookie', cookie);
  };

  return {
    /** The credentials kept under `key`, or null when none are. */
    find(key: string | undefined): T | null {
      const raw = findRaw(key);
      return raw === null ? null : codec.decode(raw);
    },

    /** Gives the credentials kept under `key` another hour. */
    renew(key: string) {
      const raw = findRaw(key);
      if (raw !== null) keepRaw(key, raw);
    },

    /**
     * Keeps a link's credentials under the key it returns: the one already
     * holding them, else a new one, dropping the oldest past the limit.
     * Null for malformed credentials, which are never kept.
     */
    keep(value: T): string | null {
      const raw = codec.encode(value);
      if (raw === null || !isEmailLinkValue(raw)) return null;
      const known = cookies.keyOf(cookieHeader(), raw);
      if (!known) {
        for (const key of cookies.toDrop(cookieHeader())) {
          appendResponseHeader('Set-Cookie', cookies.drop(key));
        }
      }
      const key = known ?? newEmailLinkKey();
      keepRaw(key, raw);
      return key;
    },

    /** Drops the credentials kept under `key`, such as a rejected token. */
    drop(key: string) {
      if (isEmailLinkKey(key)) {
        appendResponseHeader('Set-Cookie', cookies.drop(key));
      }
    },

    /**
     * Runs `action` with the credentials kept under `key`, renewing them
     * after it succeeds. Throws when none are kept; the page then says to
     * open the email's link again.
     */
    async withValue<R>(
      key: string,
      action: (value: T) => Promise<R>,
    ): Promise<R> {
      const raw = findRaw(key);
      const value = raw === null ? null : codec.decode(raw);
      if (raw === null || value === null) {
        throw new Error('email_link_expired');
      }
      const result = await action(value);
      keepRaw(key, raw);
      return result;
    },
  };
}

/** A part of a dotted value: ids and hex tokens, never a dot. */
const PART = /^[A-Za-z0-9_-]+$/;

/**
 * A codec for credentials that are a fixed list of id or token parts,
 * kept as one dot-joined value.
 */
export function dottedCodec<T>(
  toParts: (value: T) => readonly string[],
  fromParts: (parts: readonly string[]) => T | null,
  count: number,
): EmailLinkCodec<T> {
  return {
    encode: (value) => {
      const parts = toParts(value);
      return parts.length === count && parts.every((part) => PART.test(part))
        ? parts.join('.')
        : null;
    },
    decode: (raw) => {
      const parts = raw.split('.');
      return parts.length === count && parts.every((part) => PART.test(part))
        ? fromParts(parts)
        : null;
    },
  };
}
