// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getCompanyMarkets } = vi.hoisted(() => ({
  getCompanyMarkets: vi.fn(),
}));

vi.mock('../server/queries', () => ({ getCompanyMarkets }));

import { useCompanyMarketSuggestions } from './-use-company-market-suggestions';

beforeEach(() => {
  vi.useFakeTimers();
  getCompanyMarkets.mockReset();
  getCompanyMarkets.mockResolvedValue({
    data: [
      {
        object: 'company_market',
        slug: 'industrial-robotics',
        name: 'Industrial Robotics',
        companyCount: 12,
      },
    ],
  });
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  cleanup();
});

describe('useCompanyMarketSuggestions', () => {
  it('debounces market text through the Board markets API and exposes its suggestions', async () => {
    const { result } = renderHook(() => useCompanyMarketSuggestions(true));

    expect(result.current.suggestions).toEqual([]);

    act(() => result.current.onQueryChange('r'));
    await act(async () => vi.advanceTimersByTimeAsync(500));
    expect(getCompanyMarkets).not.toHaveBeenCalled();

    act(() => result.current.onQueryChange('indu'));
    await act(async () => vi.advanceTimersByTimeAsync(210));

    expect(getCompanyMarkets).toHaveBeenCalledWith({
      data: { search: 'indu', limit: 10 },
    });
    expect(result.current.suggestions).toEqual([
      { slug: 'industrial-robotics', name: 'Industrial Robotics' },
    ]);
  });

  it('does not query markets outside the Companies search scope', async () => {
    const { result } = renderHook(() => useCompanyMarketSuggestions(false));

    act(() => result.current.onQueryChange('industrial'));
    await act(async () => vi.advanceTimersByTimeAsync(500));

    expect(getCompanyMarkets).not.toHaveBeenCalled();
    expect(result.current.suggestions).toEqual([]);
  });
});
