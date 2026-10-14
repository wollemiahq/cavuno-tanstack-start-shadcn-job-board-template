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
const dependencies: LocationSuggestionDependencies = {
  searchPlaces,
  searchTalentPlaces,
};

beforeEach(() => {
  vi.useFakeTimers();
  searchPlaces.mockReset();
  searchPlaces.mockResolvedValue({ data: [] });
  searchTalentPlaces.mockReset();
  searchTalentPlaces.mockResolvedValue({ data: [] });
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  cleanup();
});

describe('useLocationSuggestions — route-owned place loading', () => {
  it('waits for a meaningful query and debounces the Board request', async () => {
    const { result } = renderHook(() =>
      useLocationSuggestions('en', 'jobs', dependencies),
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
      useLocationSuggestions('en', 'jobs', dependencies),
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
      useLocationSuggestions('en', 'jobs', dependencies),
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
      useLocationSuggestions('en', 'jobs', dependencies),
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
      useLocationSuggestions('en', 'talent', dependencies),
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
      useLocationSuggestions('fr', 'talent', dependencies),
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
      useLocationSuggestions('en', 'talent', dependencies),
    );

    const place = await result.current.resolve('Lond');

    expect(searchTalentPlaces).toHaveBeenCalledTimes(1);
    expect(searchPlaces).toHaveBeenCalledTimes(1);
    expect(place).toEqual(expect.objectContaining({ slug: 'london-uk' }));
  });
});
