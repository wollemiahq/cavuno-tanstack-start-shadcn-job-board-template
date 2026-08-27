import { describe, expect, it } from 'vitest';

import { resolveBoardAds } from './board-ads';

describe('resolveBoardAds', () => {
  it('is off when context has no ads group', () => {
    expect(resolveBoardAds({})).toEqual({ enabled: false, clientId: null });
    expect(resolveBoardAds(null)).toEqual({ enabled: false, clientId: null });
  });

  it('requires enabled true and a ca-pub- plus 16 digit client id', () => {
    expect(
      resolveBoardAds({
        ads: { enabled: true, clientId: 'ca-pub-1234567890123456' },
      }),
    ).toEqual({ enabled: true, clientId: 'ca-pub-1234567890123456' });
    expect(
      resolveBoardAds({
        ads: { enabled: false, clientId: 'ca-pub-1234567890123456' },
      }),
    ).toEqual({ enabled: false, clientId: null });
    expect(
      resolveBoardAds({
        ads: { enabled: true, clientId: 'ca-pub-short' },
      }),
    ).toEqual({ enabled: true, clientId: null });
  });
});
