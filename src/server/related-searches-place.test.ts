import { describe, expect, it } from 'vitest';

import { relatedSearchesPlace } from './jobs-listing-pages';

import { placeSearchRadius } from '@/board/search-radius';

const city = {
  canonicalSlug: 'berlin',
  suggested: false,
  geo: { placeType: 'city', lat: 52.5, lng: 13.4, countryCode: 'DE' },
} as const;

describe('relatedSearchesPlace', () => {
  it('scopes chips to an exact place listing', () => {
    expect(relatedSearchesPlace(city, null, null)).toBe('berlin');
    expect(
      relatedSearchesPlace(city, null, placeSearchRadius(city, 0, 25)),
    ).toBe('berlin');
  });

  it('keeps chips board-wide when nearby jobs widen the counts', () => {
    expect(
      relatedSearchesPlace(city, null, placeSearchRadius(city, undefined, 25)),
    ).toBeNull();
  });

  it('keeps chips board-wide for arrangements and suggested places', () => {
    expect(relatedSearchesPlace(city, 'remote', null)).toBeNull();
    expect(relatedSearchesPlace({ ...city, suggested: true }, null, null)).toBe(
      null,
    );
  });
});
