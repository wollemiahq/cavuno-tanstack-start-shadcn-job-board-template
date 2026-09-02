import { describe, expect, it, vi } from 'vitest';

import { fetchGoogleFontSubset, loadOgFont, type FontFetch } from './og-font';

const CSS = `@font-face {
  font-family: 'Inter';
  src: url(https://fonts.gstatic.com/s/inter/v20/abc.ttf) format('truetype');
}`;

interface RecordedCall {
  url: string;
  headers: Record<string, string>;
  cf: unknown;
}

/** A FontFetch that routes by URL prefix and records what it was asked. */
function fakeFetch(
  handlers: Record<string, () => Response | Promise<Response>>,
) {
  const calls: RecordedCall[] = [];
  const fetchImpl: FontFetch = async (url, init) => {
    const headers: Record<string, string> = {};
    new Headers(init?.headers).forEach((value, key) => {
      headers[key] = value;
    });
    calls.push({ url, headers, cf: init?.cf });
    const key = Object.keys(handlers).find((prefix) => url.startsWith(prefix));
    if (!key) throw new Error(`unexpected fetch ${url}`);
    return handlers[key]();
  };
  return { fetchImpl, calls };
}

describe('fetchGoogleFontSubset', () => {
  it('resolves the CSS then the binary without touching the Cache API', async () => {
    const bytes = new Uint8Array([1, 2, 3]).buffer;
    const { fetchImpl, calls } = fakeFetch({
      'https://fonts.googleapis.com/css2': () => new Response(CSS),
      'https://fonts.gstatic.com/': () => new Response(bytes),
    });
    // A Workers-for-Platforms tenant refuses caches.default; the loader must
    // never reach for it.
    const cachesSpy = vi.fn(() => {
      throw new Error(
        'This Worker is not permitted to access the default cache.',
      );
    });
    vi.stubGlobal('caches', {
      get default() {
        return cachesSpy();
      },
    });
    try {
      const data = await fetchGoogleFontSubset(
        { family: 'Inter', weight: 600, text: 'Hello' },
        fetchImpl,
      );
      expect(new Uint8Array(data)).toEqual(new Uint8Array([1, 2, 3]));
      expect(cachesSpy).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }

    const [css, binary] = calls;
    expect(css.url).toBe(
      'https://fonts.googleapis.com/css2?family=Inter%3Awght%40600&text=Hello',
    );
    // Legacy UA so Google serves a TrueType `src:` Satori can parse.
    expect(css.headers['user-agent']).toContain('AppleWebKit/533.21.1');
    // Edge reuse comes from cf.cacheTtl on both fetches.
    expect(css.cf).toEqual({ cacheTtl: 3600, cacheEverything: true });
    expect(binary.url).toBe('https://fonts.gstatic.com/s/inter/v20/abc.ttf');
    expect(binary.cf).toEqual({ cacheTtl: 3600, cacheEverything: true });
  });

  it('throws when the CSS carries no TrueType/OpenType source', async () => {
    const { fetchImpl } = fakeFetch({
      'https://fonts.googleapis.com/css2': () =>
        new Response(`src: url(https://x/y.woff2) format('woff2');`),
    });
    await expect(
      fetchGoogleFontSubset({ family: 'Inter' }, fetchImpl),
    ).rejects.toThrow(/Could not find font URL/);
  });

  it('throws on a non-2xx CSS response instead of parsing the error page', async () => {
    const { fetchImpl } = fakeFetch({
      'https://fonts.googleapis.com/css2': () =>
        new Response('nope', { status: 400 }),
    });
    await expect(
      fetchGoogleFontSubset({ family: 'Nope' }, fetchImpl),
    ).rejects.toThrow(/400/);
  });
});

describe('loadOgFont', () => {
  it('falls back to Inter when the theme family is not Google-servable', async () => {
    let cssCalls = 0;
    const { fetchImpl } = fakeFetch({
      'https://fonts.googleapis.com/css2': () => {
        cssCalls += 1;
        return cssCalls === 1
          ? new Response('missing', { status: 400 })
          : new Response(CSS);
      },
      'https://fonts.gstatic.com/': () => new Response(new ArrayBuffer(4)),
    });
    const font = await loadOgFont('Hello', fetchImpl);
    expect(font.name).toBe('Inter');
    expect(font.data.byteLength).toBe(4);
  });

  it('rejects when both the theme font and Inter fail (egress-blocked runtime)', async () => {
    const { fetchImpl } = fakeFetch({
      'https://fonts.googleapis.com/css2': () => {
        throw new TypeError('fetch failed');
      },
    });
    await expect(loadOgFont('Hello', fetchImpl)).rejects.toThrow(
      /fetch failed/,
    );
  });
});
