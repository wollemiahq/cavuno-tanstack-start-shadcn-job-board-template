// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  useGlobalLocationSuggestions,
  type GlobalLocationSuggestionDependencies,
} from './-use-global-location-suggestions';

const searchLocations =
  vi.fn<GlobalLocationSuggestionDependencies['searchLocations']>();
let sessions = 0;
const dependencies: GlobalLocationSuggestionDependencies = {
  searchLocations,
  newSession: () => `session-${++sessions}`,
};

const lyon = {
  object: 'location' as const,
  id: 'loc-lyon',
  name: 'Lyon',
  fullName: 'Lyon, Auvergne-Rhône-Alpes, France',
  contextLabel: 'Auvergne-Rhône-Alpes, France',
  placeType: 'city' as const,
  countryCode: 'FR',
};

beforeEach(() => {
  vi.useFakeTimers();
  sessions = 0;
  searchLocations.mockReset();
  searchLocations.mockResolvedValue({ data: [lyon] });
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  cleanup();
});

async function typeQuery(
  result: { current: ReturnType<typeof useGlobalLocationSuggestions> },
  q: string,
) {
  act(() => result.current.onQueryChange(q));
  await act(async () => vi.advanceTimersByTimeAsync(250));
}

describe('useGlobalLocationSuggestions — worldwide location search', () => {
  it('narrows to the allowed countries and maps results to pickable places', async () => {
    const { result } = renderHook(() =>
      useGlobalLocationSuggestions({ countries: ['FR', 'BE'] }, dependencies),
    );

    await typeQuery(result, 'L');
    expect(searchLocations).not.toHaveBeenCalled();

    await typeQuery(result, 'Lyo');
    expect(searchLocations).toHaveBeenCalledWith({
      data: { q: 'Lyo', limit: 8, session: 'session-1', country: 'FR,BE' },
    });
    expect(result.current.suggestions).toEqual([
      expect.objectContaining({
        id: 'loc-lyon',
        name: 'Lyon',
        fullName: 'Lyon, Auvergne-Rhône-Alpes, France',
        contextLabel: 'Auvergne-Rhône-Alpes, France',
        countryCode: 'FR',
      }),
    ]);
  });

  it('reuses one session across keystrokes and starts a new one after a pick', async () => {
    const { result } = renderHook(() =>
      useGlobalLocationSuggestions({}, dependencies),
    );

    await typeQuery(result, 'Ly');
    await typeQuery(result, 'Lyo');
    act(() => result.current.onPicked?.());
    await typeQuery(result, 'Pa');

    expect(searchLocations.mock.calls.map(([input]) => input.data)).toEqual([
      { q: 'Ly', limit: 8, session: 'session-1' },
      { q: 'Lyo', limit: 8, session: 'session-1' },
      { q: 'Pa', limit: 8, session: 'session-2' },
    ]);
  });

  it('offers nothing while the search is unavailable', async () => {
    searchLocations.mockRejectedValue(new Error('locations_unavailable'));
    const { result } = renderHook(() =>
      useGlobalLocationSuggestions({}, dependencies),
    );

    await typeQuery(result, 'Lyo');

    expect(result.current.suggestions).toEqual([]);
    expect(result.current.loading).toBe(false);
  });
});
