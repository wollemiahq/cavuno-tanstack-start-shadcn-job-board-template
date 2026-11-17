import { describe, expect, it } from 'vitest';

import {
  EMAIL_LINK_LIMIT,
  EMAIL_LINK_PREFIXES,
  emailLinkCookies,
  newEmailLinkKey,
} from './email-link-cookies';

const preferences = emailLinkCookies(EMAIL_LINK_PREFIXES.emailPreferences);
const alerts = emailLinkCookies(EMAIL_LINK_PREFIXES.alertsManage);

/** The `Cookie` request header a browser sends back for `Set-Cookie`s. */
function sentBack(...setCookies: Array<string | null>): string {
  return setCookies
    .map((setCookie) => {
      if (!setCookie) throw new Error('expected a Set-Cookie value');
      return setCookie.split(';')[0]!;
    })
    .join('; ');
}

describe('email link cookies', () => {
  it("keeps two people's links apart, each in its own cookie", () => {
    const a = newEmailLinkKey();
    const b = newEmailLinkKey();
    const header = `theme=dark; ${sentBack(
      preferences.keep(a, 'userA.aaaa'),
      preferences.keep(b, 'userB.bbbb'),
    )}`;

    // A tab opened for A still acts for A after B's link is opened.
    expect(preferences.find(header, a)).toBe('userA.aaaa');
    expect(preferences.find(header, b)).toBe('userB.bbbb');
    // Reopening a link reuses its key.
    expect(preferences.keyOf(header, 'userB.bbbb')).toBe(b);
    expect(preferences.keyOf(header, 'userC.cccc')).toBeNull();
  });

  it("keeps each page's links to that page", () => {
    const key = newEmailLinkKey();
    const header = sentBack(alerts.keep(key, 'sub1.hmac'));
    expect(alerts.find(header, key)).toBe('sub1.hmac');
    expect(preferences.find(header, key)).toBeNull();
    expect(preferences.toDrop(header)).toEqual([]);
  });

  it('names each cookie by a fresh random key, not one derived from the link', () => {
    const keys = new Set(Array.from({ length: 20 }, () => newEmailLinkKey()));
    expect(keys.size).toBe(20);
    for (const key of keys) expect(key).toMatch(/^[0-9a-f]{16}$/);
  });

  it('is host-only, httpOnly, secure and lasts an hour from its own use', () => {
    const a = newEmailLinkKey();
    const kept = preferences.keep(a, 'userA.aaaa')!;
    expect(kept.startsWith(`__Host-cavuno_ep_${a}=userA.aaaa;`)).toBe(true);
    for (const attribute of ['HttpOnly', 'Secure', 'Path=/', 'Max-Age=3600']) {
      expect(kept).toContain(attribute);
    }
    const dropped = preferences.drop(a);
    expect(dropped.startsWith(`__Host-cavuno_ep_${a}=;`)).toBe(true);
    expect(dropped).toContain('Max-Age=0');
  });

  it('keeps at most the limit, dropping the oldest first', () => {
    const keys = Array.from({ length: EMAIL_LINK_LIMIT + 2 }, () =>
      newEmailLinkKey(),
    );
    const header = sentBack(
      ...keys.map((key, i) => preferences.keep(key, `u${i}.t`)),
    );
    // Room for one more: the three oldest go.
    expect(preferences.toDrop(header)).toEqual(keys.slice(0, 3));
    expect(
      preferences.toDrop(sentBack(preferences.keep(keys[0]!, 'u0.t'))),
    ).toEqual([]);
    expect(preferences.toDrop(null)).toEqual([]);
  });

  it('never writes or reads a value that is not a plain token', () => {
    const a = newEmailLinkKey();
    expect(preferences.keep(a, 'a;b')).toBeNull();
    expect(preferences.keep(a, 'x'.repeat(201))).toBeNull();
    expect(preferences.keep('not-a-key', 'tok')).toBeNull();
    expect(preferences.find(`__Host-cavuno_ep_${a}=a%3Bb`, a)).toBeNull();
    expect(preferences.find(null, a)).toBeNull();
  });
});
