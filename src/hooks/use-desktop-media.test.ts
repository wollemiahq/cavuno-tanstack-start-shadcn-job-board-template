// @vitest-environment jsdom

import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DESKTOP_MEDIA_QUERY, useDesktopMedia } from './use-desktop-media';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('useDesktopMedia', () => {
  it('reports live matchMedia matches on the client', () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn().mockImplementation((query: string) => {
        expect(query).toBe(DESKTOP_MEDIA_QUERY);
        return {
          matches: true,
          media: query,
          onchange: null,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          addListener: vi.fn(),
          removeListener: vi.fn(),
          dispatchEvent: vi.fn(),
        };
      }),
    });

    const { result } = renderHook(() => useDesktopMedia());
    expect(result.current).toBe(true);
  });
});

describe('desktop media subscription', () => {
  it('updates on changes and removes its listener on unmount', async () => {
    const { act } = await import('@testing-library/react');
    let callback: (() => void) | undefined;
    const media = {
      matches: false,
      addEventListener: vi.fn((_event: string, listener: () => void) => {
        callback = listener;
      }),
      removeEventListener: vi.fn(),
    };
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn(() => media),
    });
    const { result, unmount } = renderHook(() => useDesktopMedia());
    expect(result.current).toBe(false);
    act(() => {
      media.matches = true;
      callback?.();
    });
    expect(result.current).toBe(true);
    unmount();
    expect(media.removeEventListener).toHaveBeenCalledWith('change', callback);
  });
});
