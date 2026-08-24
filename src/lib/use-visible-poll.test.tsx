// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useVisiblePoll } from './use-visible-poll';

afterEach(() => {
  vi.useRealTimers();
});

describe('useVisiblePoll', () => {
  it('keeps slow interval and visibility refreshes single-flight', async () => {
    vi.useFakeTimers();
    let finishRequest: (() => void) | undefined;
    const callback = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finishRequest = resolve;
        }),
    );

    renderHook(() => useVisiblePoll(callback, 1_000));
    await act(() => vi.advanceTimersByTimeAsync(1_000));
    expect(callback).toHaveBeenCalledOnce();

    document.dispatchEvent(new Event('visibilitychange'));
    await act(() => vi.advanceTimersByTimeAsync(5_000));
    expect(callback).toHaveBeenCalledOnce();

    const finishFirstRequest = finishRequest;
    await act(async () => finishFirstRequest?.());
    expect(callback).toHaveBeenCalledTimes(2);
  });
});
