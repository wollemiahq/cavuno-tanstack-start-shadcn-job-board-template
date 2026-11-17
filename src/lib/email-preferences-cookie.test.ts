import { describe, expect, it } from 'vitest';

import {
  dropEmailPreferencesEntry,
  EMAIL_PREFERENCES_COOKIE,
  EMAIL_PREFERENCES_LIMIT,
  emailPreferencesPerson,
  findEmailPreferencesToken,
  keepEmailPreferencesEntry,
} from './email-preferences-cookie';

/** The `Cookie` request header a browser sends back for a `Set-Cookie`. */
function sentBack(setCookie: string | null): string {
  if (!setCookie) throw new Error('expected a Set-Cookie value');
  return setCookie.split(';')[0]!;
}

describe('email preferences cookie', () => {
  it("keeps two people's tokens apart, each under its own fingerprint", async () => {
    const a = await emailPreferencesPerson('userA.aaaa');
    const b = await emailPreferencesPerson('userB.bbbb');
    let header = sentBack(keepEmailPreferencesEntry(null, a, 'userA.aaaa'));
    header = `theme=dark; ${sentBack(keepEmailPreferencesEntry(header, b, 'userB.bbbb'))}`;

    // A tab opened for A still acts for A after B's link is opened.
    expect(findEmailPreferencesToken(header, a)).toBe('userA.aaaa');
    expect(findEmailPreferencesToken(header, b)).toBe('userB.bbbb');
    expect(a).toMatch(/^[0-9a-f]{16}$/);
    expect(a).not.toBe(b);

    header = sentBack(dropEmailPreferencesEntry(header, a));
    expect(findEmailPreferencesToken(header, a)).toBeNull();
    expect(findEmailPreferencesToken(header, b)).toBe('userB.bbbb');
  });

  it('is host-only, httpOnly, secure and short-lived, and clears when empty', async () => {
    const a = await emailPreferencesPerson('userA.aaaa');
    const kept = keepEmailPreferencesEntry(null, a, 'userA.aaaa')!;
    expect(EMAIL_PREFERENCES_COOKIE.startsWith('__Host-')).toBe(true);
    expect(kept.startsWith(`${EMAIL_PREFERENCES_COOKIE}=`)).toBe(true);
    for (const attribute of ['HttpOnly', 'Secure', 'Path=/', 'Max-Age=3600']) {
      expect(kept).toContain(attribute);
    }
    expect(dropEmailPreferencesEntry(sentBack(kept), a)).toContain('Max-Age=0');
  });

  it('holds a few people, dropping the oldest first', async () => {
    let header: string | null = null;
    const people: string[] = [];
    for (let i = 0; i <= EMAIL_PREFERENCES_LIMIT; i++) {
      const person = await emailPreferencesPerson(`user${i}.t`);
      people.push(person);
      header = sentBack(
        keepEmailPreferencesEntry(header, person, `user${i}.t`),
      );
    }
    expect(findEmailPreferencesToken(header, people[0]!)).toBeNull();
    expect(findEmailPreferencesToken(header, people.at(-1)!)).toBe(
      `user${EMAIL_PREFERENCES_LIMIT}.t`,
    );
  });

  it('never writes or reads a value that is not a plain token', async () => {
    const a = await emailPreferencesPerson('x');
    expect(keepEmailPreferencesEntry(null, a, 'a;b')).toBeNull();
    expect(keepEmailPreferencesEntry(null, 'not-a-print', 'tok')).toBeNull();
    expect(
      findEmailPreferencesToken(
        `${EMAIL_PREFERENCES_COOKIE}=${encodeURIComponent(`${a}:a;b`)}`,
        a,
      ),
    ).toBeNull();
    expect(findEmailPreferencesToken(null, a)).toBeNull();
  });
});
