// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  useLocationSuggestions,
  type LocationSuggestionDependencies,
} from './-use-location-suggestions';

const searchPlaces = vi.fn<LocationSuggestionDependencies['searchPlaces']>();
const searchTalentPlaces =
  vi.fn<LocationSuggestionDependencies['searchTalentPlaces']>();
const suggestPlaces = vi.fn<LocationSuggestionDependencies['suggestPlaces']>();
const london = {
  object: 'place' as const,
  id: 'place-london',
  parentId: null,
  slug: 'london-uk',
  canonicalSlug: 'london-uk',
  name: 'London',
  displayName: 'London',
  placeType: 'city',
  countryCode: 'GB',
  regionCode: null,
  jobCount: 4,
};
/** A place from `places.suggest`: any settlement, never a board place. */
function suggested(
  name: string,
  countryCode: string,
  regionCode: string | null,
  context: string,
) {
  const slug = `${name.toLowerCase().replace(/\s+/g, '-')}-${countryCode.toLowerCase()}`;
  return {
    object: 'place' as const,
    id: `gazetteer:${slug}`,
    parentId: null,
    slug,
    canonicalSlug: slug,
    name,
    displayName: `${name}, ${context}`,
    placeType: 'city',
    countryCode,
    regionCode,
    jobCount: 0,
  };
}
const dependencies: LocationSuggestionDependencies = {
  searchPlaces,
  searchTalentPlaces,
  suggestPlaces,
};

beforeEach(() => {
  vi.useFakeTimers();
  searchPlaces.mockReset();
  searchPlaces.mockResolvedValue({ data: [] });
  searchTalentPlaces.mockReset();
  searchTalentPlaces.mockResolvedValue({ data: [] });
  suggestPlaces.mockReset();
  suggestPlaces.mockResolvedValue({ data: [] });
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  cleanup();
});

describe('useLocationSuggestions — route-owned place loading', () => {
  it('waits for a meaningful query and debounces the Board request', async () => {
    const { result } = renderHook(() =>
      useLocationSuggestions('en', 'jobs', {}, dependencies),
    );

    act(() => result.current.onQueryChange('L'));
    await act(async () => vi.advanceTimersByTimeAsync(500));
    expect(searchPlaces).not.toHaveBeenCalled();

    act(() => result.current.onQueryChange('Lon'));
    await act(async () => vi.advanceTimersByTimeAsync(150));
    expect(searchPlaces).not.toHaveBeenCalled();
    await act(async () => vi.advanceTimersByTimeAsync(60));

    expect(searchPlaces).toHaveBeenCalledWith({
      data: { q: 'Lon', limit: 10 },
    });
  });

  it('resolves typed text from the suggestions already shown for it', async () => {
    searchPlaces.mockResolvedValue({ data: [london] });
    const { result } = renderHook(() =>
      useLocationSuggestions('en', 'jobs', {}, dependencies),
    );

    act(() => result.current.onQueryChange('Lond'));
    await act(async () => vi.advanceTimersByTimeAsync(250));
    searchPlaces.mockClear();

    const place = await result.current.resolve('Lond');

    expect(place).toEqual(expect.objectContaining({ slug: 'london-uk' }));
    expect(searchPlaces).not.toHaveBeenCalled();
  });

  it('fetches once to resolve text the suggestions have not caught up with', async () => {
    searchPlaces.mockResolvedValue({ data: [london] });
    const { result } = renderHook(() =>
      useLocationSuggestions('en', 'jobs', {}, dependencies),
    );

    const place = await result.current.resolve(' Lond ');

    expect(searchPlaces).toHaveBeenCalledTimes(1);
    expect(searchPlaces).toHaveBeenCalledWith({
      data: { q: 'Lond', limit: 10 },
    });
    expect(place).toEqual(expect.objectContaining({ slug: 'london-uk' }));
  });

  it('resolves nothing when the board has no jobs in a matching place', async () => {
    const { result } = renderHook(() =>
      useLocationSuggestions('en', 'jobs', {}, dependencies),
    );

    await expect(result.current.resolve('Atlantis')).resolves.toBeNull();
    await expect(result.current.resolve('A')).resolves.toBeNull();
  });
  it('suggests the places candidates live in for the talent filter', async () => {
    searchTalentPlaces.mockResolvedValue({
      data: [
        {
          object: 'talent_place',
          id: london.id,
          parentId: null,
          slug: london.slug,
          canonicalSlug: london.canonicalSlug,
          name: london.name,
          displayName: london.displayName,
          placeType: london.placeType,
          countryCode: london.countryCode,
          regionCode: null,
          candidateCount: 3,
        },
      ],
    });
    const { result } = renderHook(() =>
      useLocationSuggestions('en', 'talent', {}, dependencies),
    );

    const place = await result.current.resolve('Lond');

    expect(searchPlaces).not.toHaveBeenCalled();
    expect(searchTalentPlaces).toHaveBeenCalledWith({
      data: { q: 'Lond', limit: 10 },
    });
    expect(place).toEqual(expect.objectContaining({ slug: 'london-uk' }));
  });

  it('falls back to job places by English slug when the talent list throws', async () => {
    searchTalentPlaces.mockRejectedValue(new Error('restricted'));
    searchPlaces.mockResolvedValue({
      data: [{ ...london, slug: 'london-uk', canonicalSlug: 'londres' }],
    });
    const { result } = renderHook(() =>
      useLocationSuggestions('fr', 'talent', {}, dependencies),
    );

    act(() => result.current.onQueryChange('Lond'));
    await act(async () => vi.advanceTimersByTimeAsync(250));
    expect(result.current.suggestions).toEqual([
      expect.objectContaining({ slug: 'london-uk' }),
    ]);

    searchTalentPlaces.mockClear();
    searchPlaces.mockClear();
    const place = await result.current.resolve('Palo');

    expect(searchTalentPlaces).toHaveBeenCalledTimes(1);
    expect(searchPlaces).toHaveBeenCalledWith({
      data: { q: 'Palo', limit: 10 },
    });
    expect(place).toEqual(expect.objectContaining({ slug: 'london-uk' }));
  });

  it('falls back to job places when no candidate place matches', async () => {
    searchPlaces.mockResolvedValue({ data: [london] });
    const { result } = renderHook(() =>
      useLocationSuggestions('en', 'talent', {}, dependencies),
    );

    const place = await result.current.resolve('Lond');

    expect(searchTalentPlaces).toHaveBeenCalledTimes(1);
    expect(searchPlaces).toHaveBeenCalledTimes(1);
    expect(place).toEqual(expect.objectContaining({ slug: 'london-uk' }));
  });
});

describe('useLocationSuggestions — place suggestions', () => {
  const placeSuggestionsOn = { placeSuggestions: true };

  it('suggests only board places while place suggestions are off', async () => {
    searchPlaces.mockResolvedValue({ data: [london] });
    const { result } = renderHook(() =>
      useLocationSuggestions('en', 'jobs', {}, dependencies),
    );

    act(() => result.current.onQueryChange('Lond'));
    await act(async () => vi.advanceTimersByTimeAsync(250));

    expect(suggestPlaces).not.toHaveBeenCalled();
    expect(result.current.suggestions).toEqual([
      expect.objectContaining({ slug: 'london-uk' }),
    ]);
  });

  it('lists board places first, then suggestions that are not one of them', async () => {
    const boardNyc = {
      ...london,
      id: 'place-nyc',
      slug: 'new-york-city',
      canonicalSlug: 'new-york-city',
      name: 'New York',
      displayName: 'New York',
      countryCode: 'US',
      regionCode: 'US-NY',
    };
    searchPlaces.mockResolvedValue({ data: [boardNyc] });
    suggestPlaces.mockResolvedValue({
      data: [
        suggested('New York', 'US', null, 'New York, United States'),
        suggested('Newark', 'US', null, 'New Jersey, United States'),
      ],
    });
    const { result } = renderHook(() =>
      useLocationSuggestions('en', 'jobs', placeSuggestionsOn, dependencies),
    );

    act(() => result.current.onQueryChange('New'));
    await act(async () => vi.advanceTimersByTimeAsync(250));

    expect(searchPlaces).toHaveBeenCalledWith({
      data: { q: 'New', limit: 10 },
    });
    expect(suggestPlaces).toHaveBeenCalledWith({
      data: { q: 'New', limit: 5 },
    });
    expect(result.current.suggestions).toEqual([
      expect.objectContaining({ slug: 'new-york-city', name: 'New York' }),
      expect.objectContaining({
        name: 'Newark',
        contextLabel: 'New Jersey, United States',
      }),
    ]);
  });

  it('keeps the board places when the suggest request fails', async () => {
    searchPlaces.mockResolvedValue({ data: [london] });
    suggestPlaces.mockRejectedValue(new Error('rate limited'));
    const { result } = renderHook(() =>
      useLocationSuggestions('en', 'jobs', placeSuggestionsOn, dependencies),
    );

    act(() => result.current.onQueryChange('Lond'));
    await act(async () => vi.advanceTimersByTimeAsync(250));

    expect(result.current.suggestions).toEqual([
      expect.objectContaining({ slug: 'london-uk' }),
    ]);
  });

  it('resolves typed text to a suggested place when the board has none', async () => {
    const marrickville = suggested(
      'Marrickville',
      'AU',
      null,
      'Sydney, New South Wales, Australia',
    );
    suggestPlaces.mockResolvedValue({ data: [marrickville] });
    const { result } = renderHook(() =>
      useLocationSuggestions('en', 'jobs', placeSuggestionsOn, dependencies),
    );

    const place = await result.current.resolve('Marrick');

    expect(place).toEqual(
      expect.objectContaining({
        slug: marrickville.canonicalSlug,
        name: 'Marrickville',
      }),
    );
  });

  it('never suggests other places for the talent filter', async () => {
    const { result } = renderHook(() =>
      useLocationSuggestions('en', 'talent', placeSuggestionsOn, dependencies),
    );

    await result.current.resolve('Lond');

    expect(suggestPlaces).not.toHaveBeenCalled();
  });
});
