import { describe, expect, it } from 'vitest';

import {
  adsClientId,
  adsEnabled,
  adsSlot,
  adsSlotFromFile,
  readAds,
} from './site-ads';

describe('stock src/ads.json', () => {
  it('is off and yields no slots', () => {
    expect(adsEnabled()).toBe(false);
    expect(adsClientId()).toBeNull();
    expect(adsSlot('jobs:list.banner')).toBeNull();
    expect(adsSlot('jobs:list.footer')).toBeNull();
    expect(adsSlot('blog:post.sidebar')).toBeNull();
    expect(adsSlot('job:detail.similar')).toBeNull();
  });
});

describe('readAds', () => {
  const validClient = 'ca-pub-1234567890123456';
  const validSlot = '1234567890';

  it('enables only when enabled is true and clientId matches ca-pub- plus 16 digits', () => {
    expect(
      readAds({
        enabled: true,
        clientId: validClient,
        slots: {},
      }).enabled,
    ).toBe(true);
    expect(
      readAds({
        enabled: true,
        clientId: 'ca-pub-123',
        slots: {},
      }).enabled,
    ).toBe(false);
    expect(
      readAds({
        enabled: false,
        clientId: validClient,
        slots: {},
      }).enabled,
    ).toBe(false);
  });

  it('returns a slot only when that placement is enabled with a 10-digit slotId', () => {
    const file = {
      enabled: true,
      clientId: validClient,
      slots: {
        'jobs:list.banner': {
          enabled: true,
          slotId: validSlot,
          layout: 'in-article',
          format: 'auto',
          style: 'display:block',
        },
        'jobs:list.footer': { enabled: false, slotId: validSlot },
        'blog:post.sidebar': { enabled: true, slotId: 'short' },
      },
    };
    expect(adsSlotFromFile(file, 'jobs:list.banner')).toEqual({
      slotId: validSlot,
      layout: 'in-article',
      format: 'auto',
      style: 'display:block',
    });
    expect(adsSlotFromFile(file, 'jobs:list.footer')).toBeNull();
    expect(adsSlotFromFile(file, 'blog:post.sidebar')).toBeNull();
    expect(adsSlotFromFile(file, 'job:detail.similar')).toBeNull();
  });
});
