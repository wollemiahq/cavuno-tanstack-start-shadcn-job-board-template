// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  useBlogSuggestions,
  type BlogSuggestionDependencies,
} from './-use-blog-suggestions';

const searchBlogSuggestions =
  vi.fn<BlogSuggestionDependencies['searchBlogSuggestions']>();
const dependencies: BlogSuggestionDependencies = { searchBlogSuggestions };

beforeEach(() => {
  vi.useFakeTimers();
  searchBlogSuggestions.mockReset();
  searchBlogSuggestions.mockResolvedValue({ data: [] });
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  cleanup();
});

describe('useBlogSuggestions', () => {
  it('ranks posts above tags whatever order the API returns them in', async () => {
    // Pins the WIRING, not just the helper: drop the sort call from the hook
    // and the helper's own unit tests stay green while tags rank first.
    searchBlogSuggestions.mockResolvedValue({
      data: [
        { type: 'tag', slug: 'releases', name: 'Releases' },
        { type: 'post', slug: 'release-notes', title: 'Release notes' },
      ],
    });

    const { result } = renderHook(() => useBlogSuggestions(true, dependencies));

    act(() => result.current.onQueryChange('rel'));
    await act(async () => vi.advanceTimersByTimeAsync(210));

    expect(result.current.suggestions.map((s) => s.id)).toEqual([
      'post:release-notes',
      'tag:releases',
    ]);
  });

  it('does not request blog suggestions in another search scope', async () => {
    const { result } = renderHook(() =>
      useBlogSuggestions(false, dependencies),
    );

    act(() => result.current.onQueryChange('release'));
    await act(async () => vi.advanceTimersByTimeAsync(500));

    expect(searchBlogSuggestions).not.toHaveBeenCalled();
  });
});
