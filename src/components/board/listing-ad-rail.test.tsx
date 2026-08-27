// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import { listingAdRail } from './listing-ad-rail';

import { ADS_OFF } from '@/lib/board-ads';

describe('listingAdRail', () => {
  it('returns nothing when ads are off even on a wide viewport', () => {
    expect(listingAdRail(undefined, 'start', ADS_OFF, true)).toBeUndefined();
  });

  it('returns nothing for default rails below 1600px so AdSense is not requested while hidden', () => {
    expect(
      listingAdRail(
        undefined,
        'start',
        { enabled: true, clientId: 'ca-pub-1234567890123456' },
        false,
      ),
    ).toBeUndefined();
  });

  it('still mounts an override rail regardless of viewport', () => {
    const node = listingAdRail(
      { label: 'Sponsored start', content: 'Start creative' },
      'start',
      ADS_OFF,
      false,
    );
    expect(node).toBeDefined();
    expect(node?.props.label).toBe('Sponsored start');
  });
});
