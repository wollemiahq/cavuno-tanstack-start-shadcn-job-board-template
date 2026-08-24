// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { NavigationProgressIndicator } from './navigation-progress';

function bar() {
  return document.querySelector('[data-test="navigation-progress"]');
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('NavigationProgress', () => {
  it('never flashes when loaders settle inside the show delay', () => {
    vi.useFakeTimers();
    const { rerender } = render(<NavigationProgressIndicator isLoading />);
    expect(bar()).toHaveAttribute('data-phase', 'idle');

    // A preloaded nav commits in ~100ms — before the show delay elapses.
    act(() => vi.advanceTimersByTime(100));
    rerender(<NavigationProgressIndicator isLoading={false} />);
    act(() => vi.advanceTimersByTime(1000));

    expect(bar()).toHaveAttribute('data-phase', 'idle');
  });

  it('appears once loaders outlive the show delay', () => {
    vi.useFakeTimers();
    render(<NavigationProgressIndicator isLoading />);

    act(() => vi.advanceTimersByTime(150));

    expect(bar()).toHaveAttribute('data-phase', 'loading');
  });

  it('completes and settles back to idle when loading finishes', () => {
    vi.useFakeTimers();
    const { rerender } = render(<NavigationProgressIndicator isLoading />);
    act(() => vi.advanceTimersByTime(150));
    expect(bar()).toHaveAttribute('data-phase', 'loading');

    rerender(<NavigationProgressIndicator isLoading={false} />);
    expect(bar()).toHaveAttribute('data-phase', 'done');

    act(() => vi.advanceTimersByTime(400));
    expect(bar()).toHaveAttribute('data-phase', 'idle');
  });

  it('stays out of the accessibility tree', () => {
    render(<NavigationProgressIndicator isLoading={false} />);
    expect(bar()).toHaveAttribute('aria-hidden', 'true');
  });
});
