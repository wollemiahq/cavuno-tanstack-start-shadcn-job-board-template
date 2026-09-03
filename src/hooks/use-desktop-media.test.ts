// @vitest-environment jsdom

import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DESKTOP_MEDIA_QUERY, useDesktopMedia } from './use-desktop-media';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('useDesktopMedia', () => {
  it('exports the shared 48rem gate', () => {
    expect(DESKTOP_MEDIA_QUERY).toBe('(min-width: 48rem)');
  });

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
