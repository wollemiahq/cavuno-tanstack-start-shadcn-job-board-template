import { describe, expect, it, vi } from 'vitest';

import {
  installStaleChunkReload,
  STALE_CHUNK_RELOAD_COOLDOWN_MS,
  STALE_CHUNK_RELOAD_KEY,
  staleChunkReloadScript,
  type StaleChunkReloadWindow,
} from './stale-chunk-reload';

function fakeWindow(store: Map<string, string> = new Map()) {
  const listeners = new Map<string, (event: Event) => void>();
  const reload = vi.fn();
  const win: StaleChunkReloadWindow = {
    addEventListener: (type, listener) => listeners.set(type, listener),
    sessionStorage: {
      getItem: (key) => store.get(key) ?? null,
      setItem: (key, value) => void store.set(key, value),
    },
    location: { reload },
  };
  const fire = () => {
    const event = new Event('vite:preloadError', { cancelable: true });
    listeners.get('vite:preloadError')!(event);
    return event;
  };
  return { win, fire, reload, store };
}

describe('stale-chunk reload', () => {
  it('reloads once on a failed chunk import and suppresses the rethrow', () => {
    const { win, fire, reload, store } = fakeWindow();
    installStaleChunkReload(win);
    const event = fire();
    expect(reload).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
    expect(Number(store.get(STALE_CHUNK_RELOAD_KEY))).toBeGreaterThan(0);
  });

  it('lets the error propagate when the fresh document fails the same way inside the cooldown', () => {
    vi.useFakeTimers();
    try {
      const { win, fire, reload } = fakeWindow();
      installStaleChunkReload(win);
      fire();
      vi.advanceTimersByTime(STALE_CHUNK_RELOAD_COOLDOWN_MS / 2);
      const second = fire();
      expect(reload).toHaveBeenCalledTimes(1);
      expect(second.defaultPrevented).toBe(false);
      vi.advanceTimersByTime(STALE_CHUNK_RELOAD_COOLDOWN_MS);
      fire();
      expect(reload).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('still reloads when sessionStorage throws (private mode, storage disabled)', () => {
    const { win, fire, reload } = fakeWindow();
    win.sessionStorage = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('SecurityError');
      },
    };
    installStaleChunkReload(win);
    fire();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('serialises to a self-contained inline script', () => {
    const script = staleChunkReloadScript();
    expect(script.startsWith('(function')).toBe(true);
    expect(script.endsWith(')(window)')).toBe(true);
    // The inline copy carries its own constants — no outer references.
    expect(script).toContain(STALE_CHUNK_RELOAD_KEY);
    expect(script).toMatch(/60000|6e4/);
    expect(script).not.toContain('STALE_CHUNK_RELOAD');
    // And it evaluates against a window shape without touching globals.
    const { win, fire, reload } = fakeWindow();
    new Function('window', script)(win);
    fire();
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
