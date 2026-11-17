import { afterEach, describe, expect, it, vi } from 'vitest';

import { dottedCodec, emailLink } from './email-link';

// A browser's cookie jar for one page: what the response sets is what the
// next request sends.
const jar = new Map<string, string>();

vi.mock('@tanstack/react-start/server', () => ({
  getRequestHeader: () =>
    [...jar].map(([name, value]) => `${name}=${value}`).join('; ') || undefined,
  appendResponseHeader: (_name: string, cookie: string) => {
    const [pair, ...attributes] = cookie.split('; ');
    const [name, value] = pair.split('=');
    if (attributes.includes('Max-Age=0')) jar.delete(name);
    else jar.set(name, value);
  },
}));

afterEach(() => jar.clear());

// Real link credentials: ids as the API issues them, 64-hex HMAC tokens.
const SUBSCRIPTION = 'wn70brwv0x9w4n4btjermzm34n8jcjfz';
const TOKEN =
  'd504786fad24b714f005fa25e0797ec7a8fc094b3d632d8a778c5e6db8a574e3';

type Link = { subscriptionId: string; token: string; channel: string };
const link = emailLink<Link>(
  '__Host-cavuno_test_',
  dottedCodec(
    ({ subscriptionId, channel, token }) => [subscriptionId, channel, token],
    ([subscriptionId, channel, token]) => ({ subscriptionId, channel, token }),
    3,
  ),
);
const value = {
  subscriptionId: SUBSCRIPTION,
  channel: 'messageEmails',
  token: TOKEN,
};

describe('emailLink', () => {
  it('reads back the credentials a real email link kept, under its key', async () => {
    const key = link.keep(value);

    expect(key).toMatch(/^[0-9a-f]{16}$/);
    expect(link.find(key!)).toEqual(value);
    await expect(
      link.withValue(key!, async (kept) => kept.token),
    ).resolves.toBe(TOKEN);
    // Reopening the same link reuses its key.
    expect(link.keep(value)).toBe(key);
  });

  it('never keeps malformed credentials, so the page reads them as invalid', () => {
    expect(link.keep({ ...value, token: 'bad;token' })).toBeNull();
    expect(link.keep({ ...value, subscriptionId: 'a.b' })).toBeNull();
    expect(jar.size).toBe(0);
  });

  it('treats an unknown or dropped key as expired', async () => {
    const key = link.keep(value)!;
    link.drop(key);

    expect(link.find(key)).toBeNull();
    expect(link.find('0123456789abcdef')).toBeNull();
    await expect(link.withValue(key, async () => 'ran')).rejects.toThrow(
      'email_link_expired',
    );
  });
});
