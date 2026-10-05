import { describe, expect, it } from 'vitest';

import { parseSearchRadiusWithin, placeSearchRadius } from './search-radius';

import type { TaxonomyResolution } from '@cavuno/board';

function place(
  placeType: string | null,
  countryCode: string | null,
): TaxonomyResolution {
  return {
    object: 'taxonomy_resolution',
    type: 'place',
    sourceSlug: 'fixture',
    canonicalSlug: 'fixture',
    displayName: 'Fixture',
    redirectTo: null,
    geo: {
      lat: 1,
      lng: 2,
      countryCode,
      regionCode: null,
      region: null,
      city: null,
      locality: null,
      placeType,
    },
  };
}

describe('parseSearchRadiusWithin', () => {
  it('keeps a preset from the URL', () => {
    expect(parseSearchRadiusWithin('25')).toBe(25);
    expect(parseSearchRadiusWithin(100)).toBe(100);
  });

  it('drops anything that is not a preset, so the page shows the exact place', () => {
    for (const raw of ['7', '0', '-5', '25.5', 'abc', '', undefined, null]) {
      expect(parseSearchRadiusWithin(raw)).toBeUndefined();
    }
  });
});

describe('placeSearchRadius', () => {
  it('reads `within` in miles for a US city and sends kilometres', () => {
    const radius = placeSearchRadius(place('city', 'US'), 25);
    expect(radius?.unit).toBe('mi');
    expect(radius?.selected?.value).toBe(25);
    expect(radius?.selected?.km).toBeCloseTo(40.23, 2);
  });

  it('reads `within` in kilometres elsewhere', () => {
    expect(placeSearchRadius(place('locality', 'DE'), 10)).toEqual({
      unit: 'km',
      selected: { value: 10, unit: 'km', km: 10 },
    });
  });

  it('is the exact place when `within` is absent', () => {
    expect(placeSearchRadius(place('city', 'AU'), undefined)).toEqual({
      unit: 'km',
      selected: null,
    });
  });

  it('offers no distance for a region or country', () => {
    expect(placeSearchRadius(place('region', 'US'), 25)).toBeNull();
    expect(placeSearchRadius(place('country', 'FR'), undefined)).toBeNull();
    expect(placeSearchRadius(null, 25)).toBeNull();
  });

  it('offers no distance for a city without a point', () => {
    const city = place('city', 'US');
    expect(
      placeSearchRadius({ ...city, geo: { ...city.geo!, lat: null } }, 25),
    ).toBeNull();
  });
});
