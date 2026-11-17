import { describe, expect, it } from 'vitest';

import {
  dropEmailPreferencesEntry,
  EMAIL_PREFERENCES_LIMIT,
  emailPreferencesPeopleToDrop,
  findEmailPreferencesPerson,
  findEmailPreferencesToken,
  keepEmailPreferencesEntry,
  newEmailPreferencesPerson,
} from './email-preferences-cookie';

/** The `Cookie` request header a browser sends back for `Set-Cookie`s. */
function sentBack(...setCookies: Array<string | null>): string {
  return setCookies
    .map((setCookie) => {
      if (!setCookie) throw new Error('expected a Set-Cookie value');
      return setCookie.split(';')[0]!;
    })
    .join('; ');
}

describe('email preferences cookies', () => {
  it("keeps two people's tokens apart, each in its own cookie", () => {
    const a = newEmailPreferencesPerson();
    const b = newEmailPreferencesPerson();
    const header = `theme=dark; ${sentBack(
      keepEmailPreferencesEntry(a, 'userA.aaaa'),
      keepEmailPreferencesEntry(b, 'userB.bbbb'),
    )}`;

    // A tab opened for A still acts for A after B's link is opened.
    expect(findEmailPreferencesToken(header, a)).toBe('userA.aaaa');
    expect(findEmailPreferencesToken(header, b)).toBe('userB.bbbb');
    // Reopening a link reuses its key.
    expect(findEmailPreferencesPerson(header, 'userB.bbbb')).toBe(b);
    expect(findEmailPreferencesPerson(header, 'userC.cccc')).toBeNull();
  });

  it('names each cookie by a fresh random key, not one derived from the token', () => {
    const keys = new Set(
      Array.from({ length: 20 }, () => newEmailPreferencesPerson()),
    );
    expect(keys.size).toBe(20);
    for (const key of keys) expect(key).toMatch(/^[0-9a-f]{16}$/);
  });

  it('is host-only, httpOnly, secure and lasts an hour from its own use', () => {
    const a = newEmailPreferencesPerson();
    const kept = keepEmailPreferencesEntry(a, 'userA.aaaa')!;
    expect(kept.startsWith(`__Host-cavuno_ep_${a}=userA.aaaa;`)).toBe(true);
    for (const attribute of ['HttpOnly', 'Secure', 'Path=/', 'Max-Age=3600']) {
      expect(kept).toContain(attribute);
    }
    const dropped = dropEmailPreferencesEntry(a);
    expect(dropped.startsWith(`__Host-cavuno_ep_${a}=;`)).toBe(true);
    expect(dropped).toContain('Max-Age=0');
  });

  it('keeps at most the limit, dropping the oldest first', () => {
    const people = Array.from({ length: EMAIL_PREFERENCES_LIMIT + 2 }, () =>
      newEmailPreferencesPerson(),
    );
    const header = sentBack(
      ...people.map((person, i) =>
        keepEmailPreferencesEntry(person, `u${i}.t`),
      ),
    );
    // Room for one more: the three oldest go.
    expect(emailPreferencesPeopleToDrop(header)).toEqual(people.slice(0, 3));
    expect(
      emailPreferencesPeopleToDrop(
        sentBack(keepEmailPreferencesEntry(people[0]!, 'u0.t')),
      ),
    ).toEqual([]);
    expect(emailPreferencesPeopleToDrop(null)).toEqual([]);
  });

  it('never writes or reads a value that is not a plain token', () => {
    const a = newEmailPreferencesPerson();
    expect(keepEmailPreferencesEntry(a, 'a;b')).toBeNull();
    expect(keepEmailPreferencesEntry('not-a-key', 'tok')).toBeNull();
    expect(
      findEmailPreferencesToken(`__Host-cavuno_ep_${a}=a%3Bb`, a),
    ).toBeNull();
    expect(findEmailPreferencesToken(null, a)).toBeNull();
  });
});
