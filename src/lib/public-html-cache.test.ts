import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  isAnonymousPublicDocumentRequest,
  isPublicDocumentPath,
  readPublicHtmlCache,
  resetEdgeCacheRefusalForTest,
  withPublicHtmlCacheHeaders,
  writePublicHtmlCache,
} from './public-html-cache';

const originalCaches = globalThis.caches;

afterEach(() => {
  Object.defineProperty(globalThis, 'caches', {
    configurable: true,
    value: originalCaches,
  });
});

describe('public HTML cache policy', () => {
  it('recognizes public route families, including locale-prefixed paths', () => {
    expect(isPublicDocumentPath('/')).toBe(true);
    expect(isPublicDocumentPath('/de/jobs/engineering')).toBe(true);
    expect(isPublicDocumentPath('/companies/acme')).toBe(true);
    expect(isPublicDocumentPath('/employers')).toBe(true);
    expect(isPublicDocumentPath('/employers/dashboard')).toBe(false);
    expect(isPublicDocumentPath('/account')).toBe(false);
  });

  it('bypasses every request that can change server-rendered identity', () => {
    const publicUrl = 'https://board.test/jobs';
    expect(isAnonymousPublicDocumentRequest(new Request(publicUrl))).toBe(true);
    expect(
      isAnonymousPublicDocumentRequest(
        new Request(publicUrl, {
          headers: { cookie: 'cookie_consent=accepted' },
        }),
      ),
    ).toBe(true);

    for (const cookie of [
      '__Host-cavuno_board_session=secret',
      '__Host-cavuno_board_session_pk_demo-123=secret',
      '__Host-cavuno_board_access=grant',
      'cavuno_data_source=demo',
      // Consent varies SSR output (banner + dehydrated choice); the edge
      // cache ignores Vary: Cookie, so decided visitors must bypass it.
      'cavuno_cookie_consent=accepted',
      'cavuno_cookie_consent=denied',
    ]) {
      expect(
        isAnonymousPublicDocumentRequest(
          new Request(publicUrl, { headers: { cookie } }),
        ),
      ).toBe(false);
    }
  });

  it('adds edge-only freshness headers only to anonymous HTML', () => {
    const request = new Request('https://board.test/blog');
    const cached = withPublicHtmlCacheHeaders(
      request,
      new Response('<h1>Blog</h1>', {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      }),
    );
    expect(cached.headers.get('cache-control')).toBe(
      'public, max-age=0, must-revalidate',
    );
    expect(cached.headers.get('cloudflare-cdn-cache-control')).toBe(
      'public, max-age=60, stale-while-revalidate=300',
    );
    expect(cached.headers.get('vary')).toContain('Cookie');

    const personalized = withPublicHtmlCacheHeaders(
      new Request(request, {
        headers: { cookie: '__Host-cavuno_board_session=secret' },
      }),
      new Response('<h1>Blog</h1>', {
        headers: { 'Content-Type': 'text/html' },
      }),
    );
    expect(personalized.headers.get('cache-control')).toBeNull();
  });

  it('reads and writes the edge cache only for eligible responses', async () => {
    const match = vi.fn(async () => new Response('cached'));
    const put = vi.fn(async () => undefined);
    Object.defineProperty(globalThis, 'caches', {
      configurable: true,
      value: { default: { match, put } },
    });

    const request = new Request('https://board.test/jobs');
    expect(await (await readPublicHtmlCache(request))?.text()).toBe('cached');

    const response = withPublicHtmlCacheHeaders(
      request,
      new Response('fresh', { headers: { 'Content-Type': 'text/html' } }),
    );
    await writePublicHtmlCache(request, response);
    expect(match).toHaveBeenCalledOnce();
    expect(put).toHaveBeenCalledOnce();
  });
});

describe('localized section slugs stay cacheable', () => {
  it('normalizes translated slugs to canonical sections', () => {
    expect(isPublicDocumentPath('/fr/emplois')).toBe(true);
    expect(isPublicDocumentPath('/fr/emplois/skills/react')).toBe(true);
    expect(isPublicDocumentPath('/de/gehaelter')).toBe(true);
    expect(isPublicDocumentPath('/de/unternehmen')).toBe(true);
    expect(isPublicDocumentPath('/fr/entreprises')).toBe(true);
    expect(isPublicDocumentPath('/de/talente')).toBe(true);
  });
});

/**
 * Workers for Platforms is the runtime that actually serves published
 * boards, and it REFUSES the default cache rather than omitting it:
 * a dispatched Worker still has `caches`, but touching `.default` throws
 * "This Worker is not permitted to access the default cache."
 *
 * An `?.` guard only covers an ABSENT `caches`, so this threw straight
 * out of the fetch handler and every cacheable public route answered a
 * bare Cloudflare 1101 — while /post, /password and /embed/* rendered
 * fine, because they never reach this code. Local `vite preview`, CI and
 * ordinary Workers all permit the cache, so nothing except a real WFP
 * deploy can observe it. Hence these tests.
 */
describe('a runtime that REFUSES the default cache', () => {
  function installRefusingCaches() {
    resetEdgeCacheRefusalForTest();
    Object.defineProperty(globalThis, 'caches', {
      configurable: true,
      value: {
        get default(): never {
          throw new Error(
            'This Worker is not permitted to access the default cache.',
          );
        },
      },
    });
  }

  it('reads as a miss instead of throwing', async () => {
    installRefusingCaches();
    const request = new Request('https://board.example.com/');
    await expect(readPublicHtmlCache(request)).resolves.toBeUndefined();
  });

  it('writes as a no-op instead of throwing', async () => {
    installRefusingCaches();
    const request = new Request('https://board.example.com/');
    const response = new Response('<html></html>', {
      headers: { 'cache-control': 'public, max-age=0, must-revalidate' },
    });
    await expect(
      writePublicHtmlCache(request, response),
    ).resolves.toBeUndefined();
  });

  it('stops re-asking once refused', async () => {
    // The answer cannot change inside an isolate, and re-throwing per
    // request costs latency on exactly the pages this cache speeds up.
    installRefusingCaches();
    let reads = 0;
    Object.defineProperty(globalThis, 'caches', {
      configurable: true,
      get() {
        reads += 1;
        return {
          get default(): never {
            throw new Error(
              'This Worker is not permitted to access the default cache.',
            );
          },
        };
      },
    });

    const request = new Request('https://board.example.com/');
    await readPublicHtmlCache(request);
    const afterFirst = reads;
    await readPublicHtmlCache(request);

    expect(afterFirst).toBeGreaterThan(0);
    expect(reads).toBe(afterFirst);
  });
});
