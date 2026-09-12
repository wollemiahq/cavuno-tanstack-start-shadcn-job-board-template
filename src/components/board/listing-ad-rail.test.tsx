// @vitest-environment jsdom
import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { listingAdRail, useListingAdRails } from './listing-ad-rail';

import adsJson from '@/ads.json';
import { ADS_OFF } from '@/lib/board-ads';
const ads = {
  enabled: true,
  clientId: 'ca-pub-1234567890123456',
  defaultSlotId: '1234567890',
};
afterEach(() => {
  cleanup();
  Reflect.deleteProperty(adsJson.slots, 'search:rail.start');
  vi.unstubAllGlobals();
});

describe('listingAdRail', () => {
  it('returns nothing when ads are off even on a wide viewport', () => {
    expect(listingAdRail(undefined, 'end', ADS_OFF, true)).toBeUndefined();
  });
  it('uses the default for the end rail and leaves the start rail empty', () => {
    expect(listingAdRail(undefined, 'end', ads, true)).toBeDefined();
    expect(listingAdRail(undefined, 'start', ads, true)).toBeUndefined();
  });
  it('retains an explicitly configured legacy start rail', () => {
    Object.assign(adsJson.slots, {
      'search:rail.start': { enabled: true, slotId: '9876543210' },
    });
    expect(listingAdRail(undefined, 'start', ads, true)).toBeDefined();
  });
  it('does not mount stock rails below the wide breakpoint', () => {
    expect(listingAdRail(undefined, 'end', ads, false)).toBeUndefined();
  });
  it('does not mount an end rail without a configured default', () => {
    expect(
      listingAdRail(undefined, 'end', { ...ads, defaultSlotId: null }, true),
    ).toBeUndefined();
  });
  it('previews the end rail even when real advertising is off', () => {
    expect(listingAdRail(undefined, 'end', ADS_OFF, true, true)).toBeDefined();
    expect(
      listingAdRail(undefined, 'end', ADS_OFF, false, true),
    ).toBeUndefined();
  });
  it('still mounts an explicit content override regardless of viewport', () => {
    const override = {
      label: 'Sponsor',
      content: <span data-testid="creative" />,
    };
    const node = listingAdRail(override, 'start', ADS_OFF, false);
    expect(node?.props.label).toBe(override.label);
    expect(node?.props.children).toBe(override.content);
  });
  it.each([false, true])(
    'mounts the end rail only when the media query matches (%s)',
    (matches) => {
      const matchMedia = vi.fn(() => ({
        matches,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }));
      vi.stubGlobal('matchMedia', matchMedia);
      const { result } = renderHook(() => useListingAdRails(ads));
      expect(matchMedia).toHaveBeenCalledWith(
        '(min-width: 1280px) and (min-height: 700px)',
      );
      expect(matchMedia).toHaveBeenCalledWith(
        '(min-width: 1600px) and (min-height: 700px)',
      );
      expect(Boolean(result.current.endAd)).toBe(matches);
      expect(result.current.startAd).toBeUndefined();
    },
  );
});
