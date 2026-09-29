// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  useGlobalLocationSuggestions,
  type GlobalLocationSuggestionDependencies,
} from './-use-global-location-suggestions';

const searchLocations =
  vi.fn<GlobalLocationSuggestionDependencies['searchLocations']>();
const resolveLocation =
  vi.fn<GlobalLocationSuggestionDependencies['resolveLocation']>();
let sessions = 0;
const dependencies: GlobalLocationSuggestionDependencies = {
  searchLocations,
  resolveLocation,
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
  resolveLocation.mockReset();
  resolveLocation.mockResolvedValue(lyon);
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
    await act(async () => {
      await result.current.resolvePick?.(result.current.suggestions[0]!);
    });
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

describe('useGlobalLocationSuggestions — selection sessions', () => {
  it('retrieves a pick with its suggestion token before starting another session', async () => {
    const { result } = renderHook(() =>
      useGlobalLocationSuggestions({}, dependencies),
    );
    await typeQuery(result, 'Lyon');
    const picked = result.current.suggestions[0]!;
    let resolved;
    await act(async () => {
      resolved = await result.current.resolvePick!(picked);
    });
    expect(resolveLocation).toHaveBeenCalledWith({
      data: { locationId: lyon.id, session: 'session-1' },
    });
    expect(resolved).toEqual(
      expect.objectContaining({ id: lyon.id, fullName: lyon.fullName }),
    );
    await typeQuery(result, 'Paris');
    expect(searchLocations.mock.lastCall?.[0].data.session).toBe('session-2');
  });

  it('refreshes expired displayed suggestions instead of retrieving with an expired token', async () => {
    const { result } = renderHook(() =>
      useGlobalLocationSuggestions({}, dependencies),
    );
    await typeQuery(result, 'Lyon');
    const picked = result.current.suggestions[0]!;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(180_000);
    });
    await act(async () => {
      expect(await result.current.resolvePick!(picked)).toBeNull();
    });
    expect(resolveLocation).not.toHaveBeenCalled();
    expect(result.current.error).toBeTruthy();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });
    expect(searchLocations.mock.lastCall?.[0].data.session).toBe('session-2');
  });

  it('rotates before the 50th suggest can close the session', async () => {
    const { result } = renderHook(() =>
      useGlobalLocationSuggestions({}, dependencies),
    );
    for (let index = 0; index < 50; index += 1)
      await typeQuery(result, `Lyon ${index}`);
    expect(searchLocations.mock.calls[48]?.[0].data.session).toBe('session-1');
    expect(searchLocations.mock.calls[49]?.[0].data.session).toBe('session-2');
  });

  it('does not commit a retrieval after newer typing', async () => {
    let finish!: (value: typeof lyon) => void;
    resolveLocation.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const { result } = renderHook(() =>
      useGlobalLocationSuggestions({}, dependencies),
    );
    await typeQuery(result, 'Lyon');
    let pending!: ReturnType<NonNullable<typeof result.current.resolvePick>>;
    act(() => {
      pending = result.current.resolvePick!(result.current.suggestions[0]!);
    });
    expect(result.current.resolving).toBe(true);
    await typeQuery(result, 'Paris');
    expect(result.current.resolving).toBe(false);
    await act(async () => {
      finish(lyon);
      expect(await pending).toBeNull();
    });
    expect(searchLocations.mock.lastCall?.[0].data.session).toBe('session-2');
  });

  it('leaves failed selections uncommitted and refreshes under a new session', async () => {
    resolveLocation.mockRejectedValue(new Error('unavailable'));
    const { result } = renderHook(() =>
      useGlobalLocationSuggestions({}, dependencies),
    );
    await typeQuery(result, 'Lyon');
    await act(async () => {
      expect(
        await result.current.resolvePick!(result.current.suggestions[0]!),
      ).toBeNull();
    });
    expect(result.current.error).toBeTruthy();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });
    expect(searchLocations.mock.lastCall?.[0].data.session).toBe('session-2');
  });
});
