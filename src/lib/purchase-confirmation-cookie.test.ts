import { describe, expect, it } from 'vitest';

import {
  findPurchaseConfirmation,
  PURCHASE_CONFIRMATION_COOKIE,
  PURCHASE_CONFIRMATION_LIMIT,
  purchaseFingerprint,
  serializePurchaseConfirmation,
} from './purchase-confirmation-cookie';

/** The `Cookie` request header a browser sends back for a `Set-Cookie`. */
function sentBack(setCookie: string | null): string {
  if (!setCookie) throw new Error('expected a Set-Cookie value');
  return setCookie.split(';')[0]!;
}

describe('purchase confirmation cookie', () => {
  it('keeps each purchase confirmation under its own token fingerprint', async () => {
    const first = await purchaseFingerprint('token-one');
    const second = await purchaseFingerprint('token-two');
    let header = sentBack(serializePurchaseConfirmation(null, first, 'conf_A'));
    header = sentBack(serializePurchaseConfirmation(header, second, 'conf_B'));

    expect(findPurchaseConfirmation(header, first)).toBe('conf_A');
    expect(findPurchaseConfirmation(header, second)).toBe('conf_B');
    // The purchase token itself never lands in the cookie.
    expect(header).not.toContain('token-one');
  });

  it('is a host-only, httpOnly, secure cookie', async () => {
    const value = serializePurchaseConfirmation(
      null,
      await purchaseFingerprint('t'),
      'conf',
    );
    expect(value).toMatch(new RegExp(`^${PURCHASE_CONFIRMATION_COOKIE}=`));
    expect(value).toContain('HttpOnly');
    expect(value).toContain('Secure');
    expect(value).toContain('Path=/');
    expect(value).not.toContain('Domain=');
  });

  it('drops the oldest purchase once the cookie is full', async () => {
    let header: string | null = null;
    const fingerprints: string[] = [];
    for (let index = 0; index <= PURCHASE_CONFIRMATION_LIMIT; index += 1) {
      const fingerprint = await purchaseFingerprint(`token-${index}`);
      fingerprints.push(fingerprint);
      header = sentBack(
        serializePurchaseConfirmation(header, fingerprint, `conf_${index}`),
      );
    }
    expect(findPurchaseConfirmation(header, fingerprints[0]!)).toBeNull();
    expect(findPurchaseConfirmation(header, fingerprints.at(-1)!)).toBe(
      `conf_${PURCHASE_CONFIRMATION_LIMIT}`,
    );
  });

  it('ignores a tampered cookie and refuses to store a malformed token', async () => {
    const fingerprint = await purchaseFingerprint('t');
    expect(
      findPurchaseConfirmation(
        `${PURCHASE_CONFIRMATION_COOKIE}=%E0%A4%A`,
        fingerprint,
      ),
    ).toBeNull();
    expect(
      serializePurchaseConfirmation(null, fingerprint, 'bad;value'),
    ).toBeNull();
  });
});
