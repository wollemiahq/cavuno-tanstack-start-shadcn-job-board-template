import { describe, expect, it, vi } from 'vitest';

import { createBoardSeoReader } from './board-seo-cache-core';

/**
 * The root shell and the page fn's canonical-origin read both ask for
 * `board.seo()` during one SSR; they must share one upstream call.
 */
function reader(getBoardSeo: () => Promise<{ canonicalBase: string }>) {
  return createBoardSeoReader(
    { getBoardSeo, getDataSource: () => 'board', now: () => 0 },
    30_000,
  ).readBoardSeo;
}

describe('createBoardSeoReader', () => {
  it('shares one upstream read between concurrent callers', async () => {
    const seo = vi.fn(async () => ({
      canonicalBase: 'https://careers.acme.com',
    }));
    const readBoardSeo = reader(seo);

    const [a, b] = await Promise.all([readBoardSeo(), readBoardSeo()]);

    expect(seo).toHaveBeenCalledTimes(1);
    expect(b).toBe(a);
  });

  it('retries after a failed read instead of pinning the failure', async () => {
    const seo = vi
      .fn<() => Promise<{ canonicalBase: string }>>()
      .mockRejectedValueOnce(new Error('503'))
      .mockResolvedValueOnce({ canonicalBase: 'https://careers.acme.com' });
    const readBoardSeo = reader(seo);

    await expect(readBoardSeo()).rejects.toThrow('503');
    await expect(readBoardSeo()).resolves.toEqual({
      canonicalBase: 'https://careers.acme.com',
    });
    expect(seo).toHaveBeenCalledTimes(2);
  });
});
