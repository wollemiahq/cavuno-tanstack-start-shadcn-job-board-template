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
  it('reloads once without converting the failed import into a fulfilled promise', () => {
    const { win, fire, reload, store } = fakeWindow();
    installStaleChunkReload(win);
    const event = fire();
    expect(reload).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(false);
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

  it.each([
    'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    'Mozilla/5.0 (compatible; Google-InspectionTool/1.0;)',
    'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm) Chrome/116.0.1938.76 Safari/537.36',
  ])('never reloads for a crawler (%s)', (userAgent) => {
    const { win, fire, reload, store } = fakeWindow();
    win.navigator = { userAgent };
    installStaleChunkReload(win);
    fire();
    expect(reload).not.toHaveBeenCalled();
    expect(store.has(STALE_CHUNK_RELOAD_KEY)).toBe(false);
  });

  it('still reloads for a browser', () => {
    const { win, fire, reload } = fakeWindow();
    win.navigator = {
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
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
