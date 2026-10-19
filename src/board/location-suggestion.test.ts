import { describe, expect, it } from 'vitest';

import {
  suggestionsBeyondBoardPlaces,
  toLocationSuggestionVM,
  toSuggestedPlaceVM,
  toTalentPlaceSuggestionVM,
} from './location-suggestion';

const place = {
  object: 'place' as const,
  id: 'place_1',
  parentId: null,
  slug: 'london',
  canonicalSlug: 'london',
  name: 'London',
  displayName: 'London',
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
      countryCode: 'GB',
      regionCode: null,
    });
  });

  it('uses the board-language name and slug on a translated board', () => {
    expect(
      toLocationSuggestionVM(
        {
          ...place,
          slug: 'the-hague',
          canonicalSlug: 'den-haag',
          name: 'The Hague',
          displayName: 'Den Haag',
          countryCode: 'NL',
        },
        'nl',
      ),
    ).toMatchObject({ slug: 'den-haag', name: 'Den Haag' });
  });

  it('falls back to the source slug when there is no board-language slug', () => {
    expect(
      toLocationSuggestionVM({ ...place, canonicalSlug: null }, 'en')?.slug,
    ).toBe('london');
  });

  it('drops places that cannot form a canonical location route', () => {
    expect(
      toLocationSuggestionVM(
        { ...place, slug: null, canonicalSlug: null },
        'en',
      ),
    ).toBeNull();
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

const marrickville = {
  object: 'place' as const,
  id: 'gazetteer:R5701701',
  parentId: null,
  slug: 'marrickville-new-south-wales-au-r5701701',
  canonicalSlug: 'marrickville-new-south-wales-au-r5701701',
  name: 'Marrickville',
  displayName: 'Marrickville, Sydney, New South Wales, Australia',
  placeType: 'locality',
  countryCode: 'AU',
  regionCode: null,
  jobCount: 0,
};

describe('toSuggestedPlaceVM', () => {
  it('names the place and shows its region and country as context', () => {
    expect(toSuggestedPlaceVM(marrickville, 'en')).toEqual({
      id: 'gazetteer:R5701701',
      slug: 'marrickville-new-south-wales-au-r5701701',
      name: 'Marrickville',
      contextLabel: 'Sydney, New South Wales, Australia',
      countryCode: 'AU',
      regionCode: null,
      placeType: 'locality',
    });
  });

  it('falls back to the country name when the display name adds nothing', () => {
    expect(
      toSuggestedPlaceVM({ ...marrickville, displayName: 'Marrickville' }, 'en')
        ?.contextLabel,
    ).toBe('Australia');
  });

  it('drops a suggestion that cannot form a location route', () => {
    expect(
      toSuggestedPlaceVM(
        { ...marrickville, slug: null, canonicalSlug: null },
        'en',
      ),
    ).toBeNull();
  });
});

describe('suggestionsBeyondBoardPlaces', () => {
  const settlement = (
    name: string,
    countryCode: string,
    regionCode: string | null,
    placeType = 'city',
  ) => ({
    ...place,
    id: `${name}-${regionCode ?? countryCode}`,
    name,
    displayName: name,
    placeType,
    countryCode,
    regionCode,
  });
  const suggestion = (
    name: string,
    countryCode: string,
    regionCode: string | null,
  ) => ({
    ...marrickville,
    id: `gazetteer:${name}-${regionCode ?? countryCode}`,
    name,
    displayName: `${name}, ${regionCode ?? countryCode}`,
    placeType: 'city',
    countryCode,
    regionCode,
  });

  it('hides a suggestion of unknown region behind the board place it names', () => {
    // New York City: the board's has a region, the suggestion none yet.
    const boardNyc = settlement('New York', 'US', 'US-NY');
    const suggestedNyc = suggestion('New York', 'US', null);

    expect(suggestionsBeyondBoardPlaces([boardNyc], [suggestedNyc])).toEqual(
      [],
    );
  });

  it('keeps a same-named town in another region', () => {
    const portlandMaine = suggestion('Portland', 'US', 'US-ME');

    expect(
      suggestionsBeyondBoardPlaces(
        [settlement('Portland', 'US', 'US-OR')],
        [portlandMaine, suggestion('Portland', 'US', 'US-OR')],
      ),
    ).toEqual([portlandMaine]);
  });

  it('never lets a board place with no region hide one with a region', () => {
    const portlandMaine = suggestion('Portland', 'US', 'US-ME');

    expect(
      suggestionsBeyondBoardPlaces(
        [settlement('Portland', 'US', null)],
        [portlandMaine],
      ),
    ).toEqual([portlandMaine]);
  });

  it('matches names without case or accents, in either board-place name', () => {
    expect(
      suggestionsBeyondBoardPlaces(
        [
          {
            ...settlement('Zurich', 'CH', 'CH-ZH'),
            displayName: 'Zürich',
          },
        ],
        [suggestion('ZÜRICH', 'CH', null), suggestion('zurich', 'CH', null)],
      ),
    ).toEqual([]);
  });

  it('keeps suggestions that only share a name with a region or another country', () => {
    const newYorkCity = suggestion('New York', 'US', null);
    const london = suggestion('London', 'CA', 'CA-ON');

    expect(
      suggestionsBeyondBoardPlaces(
        [
          settlement('New York', 'US', 'US-NY', 'region'),
          settlement('London', 'GB', 'GB-ENG'),
        ],
        [newYorkCity, london],
      ),
    ).toEqual([newYorkCity, london]);
  });
});

describe('toTalentPlaceSuggestionVM', () => {
  const talentPlace = {
    object: 'talent_place' as const,
    id: 'place_1',
    parentId: null,
    slug: 'london',
    canonicalSlug: 'londres',
    name: 'London',
    displayName: 'Londres',
    placeType: 'city',
    countryCode: 'GB',
    regionCode: null,
    candidateCount: 7,
  };

  it('filters by the English slug and labels with the board-language name', () => {
    expect(toTalentPlaceSuggestionVM(talentPlace, 'fr')).toEqual(
      expect.objectContaining({ slug: 'london', name: 'Londres' }),
    );
  });

  it('drops places without a filter slug', () => {
    expect(
      toTalentPlaceSuggestionVM({ ...talentPlace, slug: null }, 'en'),
    ).toBeNull();
  });
});
