import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * ADR-0098. A board with an active custom domain is still reachable on its
 * `slug.cavuno.app` hostname; canonicals, `og:url`, sitemap `<loc>`s and feed
 * links served there must name the custom domain, or the board is indexable
 * at two addresses. The published base is `board.seo().canonicalBase`.
 *
 * These pin the three properties the page fns rely on: the published base
 * wins, the request origin is the fallback when the board publishes nothing
 * usable, and folding the read into every page fn costs one upstream call per
 * isolate per TTL window rather than one per render.
 */
import {
  createPublicOriginReader,
  normalizeOrigin,
} from './public-origin-core';

interface DataSourceState {
  current: 'board' | 'demo';
}

const seoSpy = vi.fn<() => Promise<{ canonicalBase?: string | null }>>();
const requestOriginSpy = vi.fn<() => string>();
const dataSource: DataSourceState = { current: 'board' };

const { readPublicOrigin, resetPublicOriginCache } = createPublicOriginReader(
  {
    getBoardSeo: () => seoSpy(),
    getRequestOrigin: () => requestOriginSpy(),
    getDataSource: () => dataSource.current,
    now: () => Date.now(),
  },
  30_000,
);

beforeEach(() => {
  vi.useFakeTimers();
  seoSpy.mockReset();
  seoSpy.mockResolvedValue({ canonicalBase: 'https://careers.acme.com' });
  requestOriginSpy.mockReset();
  requestOriginSpy.mockReturnValue('https://acme.cavuno.app');
  dataSource.current = 'board';
  resetPublicOriginCache();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('normalizeOrigin', () => {
  it('keeps origin only, without a trailing slash or path', () => {
    expect(normalizeOrigin('https://careers.acme.com/')).toBe(
      'https://careers.acme.com',
    );
    expect(normalizeOrigin('https://careers.acme.com/jobs?a=1#b')).toBe(
      'https://careers.acme.com',
    );
    expect(normalizeOrigin('  https://careers.acme.com  ')).toBe(
      'https://careers.acme.com',
    );
  });

  it('preserves a non-default port', () => {
    expect(normalizeOrigin('http://localhost:3000/')).toBe(
      'http://localhost:3000',
    );
  });

  it('rejects anything that is not an absolute http(s) base', () => {
    expect(normalizeOrigin('')).toBeNull();
    expect(normalizeOrigin('   ')).toBeNull();
    expect(normalizeOrigin(null)).toBeNull();
    expect(normalizeOrigin(undefined)).toBeNull();
    expect(normalizeOrigin('careers.acme.com')).toBeNull();
    expect(normalizeOrigin('/jobs')).toBeNull();
    expect(normalizeOrigin('javascript:alert(1)')).toBeNull();
  });
});

describe('readPublicOrigin', () => {
  it('canonicalizes to the published base, not the host that served it', async () => {
    expect(await readPublicOrigin()).toBe('https://careers.acme.com');
    expect(requestOriginSpy).not.toHaveBeenCalled();
  });

  it('strips a trailing slash the API publishes', async () => {
    seoSpy.mockResolvedValue({ canonicalBase: 'https://careers.acme.com/' });
    expect(await readPublicOrigin()).toBe('https://careers.acme.com');
  });

  it('falls back to the request origin when the seo read fails', async () => {
    seoSpy.mockRejectedValue(new Error('503 no registered public origin'));
    expect(await readPublicOrigin()).toBe('https://acme.cavuno.app');
  });

  it('falls back to the request origin on an empty published base', async () => {
    seoSpy.mockResolvedValue({ canonicalBase: '' });
    expect(await readPublicOrigin()).toBe('https://acme.cavuno.app');
  });

  it('falls back to the request origin on an unusable published base', async () => {
    seoSpy.mockResolvedValue({ canonicalBase: 'careers.acme.com' });
    expect(await readPublicOrigin()).toBe('https://acme.cavuno.app');
  });

  it('costs ONE seo call however many page fns read it in a window', async () => {
    // Home fn + its seoBase() + the sitemap handler, same isolate.
    await Promise.all([readPublicOrigin(), readPublicOrigin()]);
    await readPublicOrigin();
    expect(seoSpy).toHaveBeenCalledTimes(1);
  });

  it('re-reads once the TTL window closes', async () => {
    await readPublicOrigin();
    vi.advanceTimersByTime(31_000);
    await readPublicOrigin();
    expect(seoSpy).toHaveBeenCalledTimes(2);
  });

  it('does not pin a failure for the whole window', async () => {
    seoSpy.mockRejectedValueOnce(new Error('transient'));
    expect(await readPublicOrigin()).toBe('https://acme.cavuno.app');
    expect(await readPublicOrigin()).toBe('https://careers.acme.com');
    expect(seoSpy).toHaveBeenCalledTimes(2);
  });

  it('never serves one data source the other board canonical', async () => {
    seoSpy.mockImplementation(async () => ({
      canonicalBase:
        dataSource.current === 'demo'
          ? 'https://demo.cavuno.app'
          : 'https://careers.acme.com',
    }));

    const primary = await readPublicOrigin();
    dataSource.current = 'demo';
    const demo = await readPublicOrigin();

    expect(primary).toBe('https://careers.acme.com');
    expect(demo).toBe('https://demo.cavuno.app');
    expect(seoSpy).toHaveBeenCalledTimes(2);
  });
});
