import { describe, expect, it } from 'vitest';

import { adsSlot, adsSlotFromFile } from './site-ads';

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
