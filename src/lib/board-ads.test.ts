import { describe, expect, it } from 'vitest';

import { ADS_OFF, resolveBoardAds } from './board-ads';

const ads = {
  enabled: true,
  clientId: 'ca-pub-1234567890123456',
  defaultSlotId: '1234567890',
};

describe('resolveBoardAds', () => {
  it('is off when context has no ads group', () => {
    expect(resolveBoardAds({ object: 'public_board' })).toEqual(ADS_OFF);
    expect(resolveBoardAds({ object: 'public_board', ads: null })).toEqual(
      ADS_OFF,
    );
  });
  it('resolves and trims publisher and default slot', () => {
    expect(
      resolveBoardAds({
        object: 'public_board',
        ads: {
          ...ads,
          clientId: ` ${ads.clientId} `,
          defaultSlotId: ` ${ads.defaultSlotId} `,
        },
      }),
    ).toEqual(ads);
  });
  it('clears the publisher and default slot when advertising is disabled', () => {
    expect(
      resolveBoardAds({
        object: 'public_board',
        ads: { ...ads, enabled: false },
      }),
    ).toEqual(ADS_OFF);
  });
  it('supports older SDK responses without a default slot', () => {
    expect(
      resolveBoardAds({
        object: 'public_board',
        ads: { enabled: true, clientId: ads.clientId },
      }),
    ).toEqual({ ...ads, defaultSlotId: null });
  });
  it('rejects malformed publisher and slot identifiers', () => {
    expect(
      resolveBoardAds({
        object: 'public_board',
        ads: { ...ads, clientId: 'ca-pub-short', defaultSlotId: 'short' },
      }),
    ).toEqual({ enabled: true, clientId: null, defaultSlotId: null });
  });
});
