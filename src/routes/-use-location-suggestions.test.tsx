// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  useLocationSuggestions,
  type LocationSuggestionDependencies,
} from './-use-location-suggestions';

const searchPlaces = vi.fn<LocationSuggestionDependencies['searchPlaces']>();
const london = {
  object: 'place' as const,
  id: 'place-london',
  parentId: null,
  slug: 'london-uk',
  name: 'London',
  placeType: 'city',
  countryCode: 'GB',
  regionCode: null,
  jobCount: 4,
};
const dependencies: LocationSuggestionDependencies = { searchPlaces };

beforeEach(() => {
  vi.useFakeTimers();
  searchPlaces.mockReset();
  searchPlaces.mockResolvedValue({ data: [] });
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  cleanup();
});

describe('useLocationSuggestions — route-owned place loading', () => {
  it('waits for a meaningful query and debounces the Board request', async () => {
    const { result } = renderHook(() =>
      useLocationSuggestions('en', dependencies),
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
      useLocationSuggestions('en', dependencies),
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
      useLocationSuggestions('en', dependencies),
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
      useLocationSuggestions('en', dependencies),
    );

    await expect(result.current.resolve('Atlantis')).resolves.toBeNull();
    await expect(result.current.resolve('A')).resolves.toBeNull();
  });
});
