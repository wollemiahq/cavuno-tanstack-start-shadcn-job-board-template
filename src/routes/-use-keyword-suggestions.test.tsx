// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { searchTaxonomySuggestions } = vi.hoisted(() => ({
  searchTaxonomySuggestions: vi.fn(),
}));

vi.mock('../server/queries', () => ({ searchTaxonomySuggestions }));

import { useKeywordSuggestions } from './-use-keyword-suggestions';

beforeEach(() => {
  vi.useFakeTimers();
  searchTaxonomySuggestions.mockReset();
  searchTaxonomySuggestions.mockResolvedValue({ data: [] });
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  cleanup();
});

describe('useKeywordSuggestions', () => {
  it('debounces meaningful job queries through the Board taxonomy API', async () => {
    const { result } = renderHook(() => useKeywordSuggestions(true));

    act(() => result.current.onQueryChange('r'));
    await act(async () => vi.advanceTimersByTimeAsync(500));
    expect(searchTaxonomySuggestions).not.toHaveBeenCalled();

    act(() => result.current.onQueryChange('rob'));
    await act(async () => vi.advanceTimersByTimeAsync(210));

    expect(searchTaxonomySuggestions).toHaveBeenCalledWith({
      data: { q: 'rob', limit: 10 },
    });
  });

  it('collapses a category and a skill sharing a name into one suggestion', async () => {
    // Pins the WIRING, not just the helper: drop the dedupe call from the hook
    // and the unit tests still pass while duplicate rows ship.
    searchTaxonomySuggestions.mockResolvedValue({
      data: [
        {
          type: 'skill',
          canonicalSlug: 'robotics-engineering',
          displayName: 'Robotics',
        },
        {
          type: 'category',
          canonicalSlug: 'robotics',
          displayName: 'Robotics',
        },
      ],
    });

    const { result } = renderHook(() => useKeywordSuggestions(true));

    act(() => result.current.onQueryChange('rob'));
    await act(async () => vi.advanceTimersByTimeAsync(210));

    expect(result.current.suggestions).toEqual([
      {
        id: 'category:robotics',
        type: 'category',
        slug: 'robotics',
        name: 'Robotics',
      },
    ]);
  });

  it('does not request job taxonomy suggestions in another search scope', async () => {
    const { result } = renderHook(() => useKeywordSuggestions(false));

    act(() => result.current.onQueryChange('robotics'));
    await act(async () => vi.advanceTimersByTimeAsync(500));

    expect(searchTaxonomySuggestions).not.toHaveBeenCalled();
  });
});
