import { describe, expect, it } from 'vitest';

import { adsSlot, adsSlotFromFile, resolveAdsSlot } from './site-ads';

describe('stock src/ads.json', () => {
  it('yields no slots until an operator fills placement ids', () => {
    expect(adsSlot('search:rail.start')).toBeNull();
    expect(adsSlot('search:rail.end')).toBeNull();
    expect(adsSlot('blog:post.sidebar')).toBeNull();
  });
});

describe('adsSlotFromFile', () => {
  const validSlot = '1234567890';

  it('returns a slot only when that placement is enabled with a 10-digit slotId', () => {
    const file = {
      slots: {
        'search:rail.start': {
          enabled: true,
          slotId: validSlot,
          format: 'vertical',
        },
        'search:rail.end': { enabled: false, slotId: validSlot },
        'blog:post.sidebar': { enabled: true, slotId: 'short' },
      },
    };
    expect(adsSlotFromFile(file, 'search:rail.start')).toEqual({
      slotId: validSlot,
      format: 'vertical',
    });
    expect(adsSlotFromFile(file, 'search:rail.end')).toBeNull();
    expect(adsSlotFromFile(file, 'blog:post.sidebar')).toBeNull();
  });
});

describe('resolveAdsSlot', () => {
  it('falls back to the board default for unconfigured placements', () => {
    expect(resolveAdsSlot('custom', ' 1234567890 ')).toEqual({
      slotId: '1234567890',
    });
  });
  it('prefers a direct unit override over the default', () => {
    expect(resolveAdsSlot('custom', '1234567890', ' 9876543210 ')).toEqual({
      slotId: '9876543210',
    });
  });
  it('fails closed for an invalid explicit override', () => {
    expect(resolveAdsSlot('custom', '1234567890', 'short')).toBeNull();
  });
  it('requires a valid default when no override exists', () => {
    expect(resolveAdsSlot('custom')).toBeNull();
    expect(resolveAdsSlot('custom', null)).toBeNull();
    expect(resolveAdsSlot('custom', 'short')).toBeNull();
  });
});
