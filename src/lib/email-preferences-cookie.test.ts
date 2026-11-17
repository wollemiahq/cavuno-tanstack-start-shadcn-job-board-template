import { describe, expect, it } from 'vitest';

import {
  clearEmailPreferencesCookie,
  EMAIL_PREFERENCES_COOKIE,
  readEmailPreferencesCookie,
  serializeEmailPreferencesCookie,
} from './email-preferences-cookie';

/** The `Cookie` request header a browser sends back for a `Set-Cookie`. */
const sentBack = (setCookie: string) => setCookie.split(';')[0]!;

describe('email preferences cookie', () => {
  it('reads back the token it keeps, among other cookies', () => {
    const kept = serializeEmailPreferencesCookie('k57abc.0f9e');
    expect(kept).not.toBeNull();
    expect(
      readEmailPreferencesCookie(`theme=dark; ${sentBack(kept!)}; lang=de`),
    ).toBe('k57abc.0f9e');
  });

  it('is host-only, httpOnly, secure and short-lived, and can be cleared', () => {
    const kept = serializeEmailPreferencesCookie('k57abc.0f9e')!;
    expect(kept.startsWith(`${EMAIL_PREFERENCES_COOKIE}=`)).toBe(true);
    expect(EMAIL_PREFERENCES_COOKIE.startsWith('__Host-')).toBe(true);
    expect(kept).toContain('HttpOnly');
    expect(kept).toContain('Secure');
    expect(kept).toContain('Path=/');
    expect(kept).toContain('Max-Age=3600');
    expect(clearEmailPreferencesCookie()).toContain('Max-Age=0');
    expect(
      readEmailPreferencesCookie(sentBack(clearEmailPreferencesCookie())),
    ).toBeNull();
  });

  it('never writes or reads a value that is not a plain token', () => {
    expect(serializeEmailPreferencesCookie('a;b')).toBeNull();
    expect(serializeEmailPreferencesCookie('')).toBeNull();
    expect(
      readEmailPreferencesCookie(`${EMAIL_PREFERENCES_COOKIE}=a%3Bb`),
    ).toBeNull();
    expect(readEmailPreferencesCookie(null)).toBeNull();
  });
});
