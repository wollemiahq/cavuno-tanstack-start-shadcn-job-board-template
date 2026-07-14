import { describe, expect, it } from 'vitest';

import { toLocationSuggestionVM } from './location-suggestion';

const place = {
  object: 'place' as const,
  id: 'place_1',
  parentId: null,
  slug: 'london',
  name: 'London',
  placeType: 'city',
  countryCode: 'GB',
  regionCode: null,
  jobCount: 42,
};

describe('toLocationSuggestionVM', () => {
  it('resolves API data into the complete presentation contract', () => {
    expect(toLocationSuggestionVM(place, 'en')).toEqual({
      id: 'place_1',
      slug: 'london',
      name: 'London',
      contextLabel: 'United Kingdom',
    });
  });

  it('drops places that cannot form a canonical location route', () => {
    expect(toLocationSuggestionVM({ ...place, slug: null }, 'en')).toBeNull();
  });

  it('keeps the option usable when country metadata is absent or malformed', () => {
    expect(
      toLocationSuggestionVM({ ...place, countryCode: null }, 'en')
        ?.contextLabel,
    ).toBeNull();
    expect(
      toLocationSuggestionVM({ ...place, countryCode: 'XXX' }, 'en')
        ?.contextLabel,
    ).toBe('XXX');
  });
});
