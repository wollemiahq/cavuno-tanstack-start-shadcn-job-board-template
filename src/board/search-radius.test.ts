import { describe, expect, it } from 'vitest';

import {
  isSearchRadiusViewNoindex,
  parseSearchRadiusWithin,
  placeJobCount,
  placeSearchRadius,
  shortPlaceName,
} from './search-radius';

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
  it('keeps a preset and `0` (the exact place) from the URL', () => {
    expect(parseSearchRadiusWithin('25')).toBe(25);
    expect(parseSearchRadiusWithin(100)).toBe(100);
    expect(parseSearchRadiusWithin(0)).toBe(0);
    expect(parseSearchRadiusWithin('0')).toBe(0);
  });

  it('drops anything else, so the page uses the default distance', () => {
    for (const raw of ['7', '-5', '25.5', 'abc', '', ' ', undefined, null]) {
      expect(parseSearchRadiusWithin(raw)).toBeUndefined();
    }
  });
});

describe('placeSearchRadius', () => {
  it('defaults a US city to 25 mi, not chosen by the URL', () => {
    const radius = placeSearchRadius(place('city', 'US'), undefined);
    expect(radius).toMatchObject({
      unit: 'mi',
      selected: { value: 25, unit: 'mi' },
      defaultOption: { value: 25, unit: 'mi' },
      explicit: false,
    });
    expect(radius?.selected?.km).toBeCloseTo(40.23, 2);
  });

  it('defaults a kilometre market to 50 km', () => {
    expect(placeSearchRadius(place('city', 'AU'), undefined)).toEqual({
      unit: 'km',
      selected: { value: 50, unit: 'km', km: 50 },
      defaultOption: { value: 50, unit: 'km', km: 50 },
      explicit: false,
    });
  });

  it('reads `within` in the place unit and marks it chosen', () => {
    expect(placeSearchRadius(place('locality', 'DE'), 10)).toMatchObject({
      unit: 'km',
      selected: { value: 10, unit: 'km', km: 10 },
      explicit: true,
    });
    expect(placeSearchRadius(place('city', 'US'), 25)?.explicit).toBe(true);
  });

  it('is the exact place for `within=0`', () => {
    expect(placeSearchRadius(place('city', 'US'), 0)).toMatchObject({
      selected: null,
      explicit: true,
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
      placeSearchRadius(
        { ...city, geo: { ...city.geo!, lat: null } },
        undefined,
      ),
    ).toBeNull();
  });
});

describe('shortPlaceName', () => {
  it('drops the region and country', () => {
    expect(
      shortPlaceName({
        ...place('city', 'US'),
        displayName: 'Houston, Texas, United States',
      }),
    ).toBe('Houston');
    expect(
      shortPlaceName({ ...place('city', 'DE'), displayName: 'Wien' }),
    ).toBe('Wien');
  });
});

describe('placeJobCount', () => {
  const houston = { sourceSlug: 'houston', canonicalSlug: 'houston' };

  it("reads the place's own count by source or canonical slug", () => {
    expect(placeJobCount([{ slug: 'houston', jobCount: 12 }], houston)).toBe(
      12,
    );
    expect(
      placeJobCount([{ slug: 'wien', jobCount: 4 }], {
        sourceSlug: 'vienna',
        canonicalSlug: 'wien',
      }),
    ).toBe(4);
  });

  it('is 0 for a place missing from the directory, null without one', () => {
    expect(placeJobCount([{ slug: 'pasadena', jobCount: 2 }], houston)).toBe(0);
    expect(placeJobCount(null, houston)).toBeNull();
  });
});

describe('isSearchRadiusViewNoindex', () => {
  const city = place('city', 'US');

  it('indexes the default distance on a place with its own jobs', () => {
    expect(
      isSearchRadiusViewNoindex(placeSearchRadius(city, undefined), 3),
    ).toBe(false);
  });

  it('noindexes the default distance on a place with no jobs of its own', () => {
    expect(
      isSearchRadiusViewNoindex(placeSearchRadius(city, undefined), 0),
    ).toBe(true);
  });

  it('keeps an unknown count indexable', () => {
    expect(
      isSearchRadiusViewNoindex(placeSearchRadius(city, undefined), null),
    ).toBe(false);
  });

  it('noindexes any explicit `within`', () => {
    expect(isSearchRadiusViewNoindex(placeSearchRadius(city, 0), 3)).toBe(true);
    expect(isSearchRadiusViewNoindex(placeSearchRadius(city, 25), 3)).toBe(
      true,
    );
  });

  it('leaves a region without a distance to its own rules', () => {
    expect(
      isSearchRadiusViewNoindex(
        placeSearchRadius(place('region', 'US'), undefined),
        0,
      ),
    ).toBe(false);
  });
});
