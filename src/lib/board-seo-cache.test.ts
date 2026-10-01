import { describe, expect, it, vi } from 'vitest';

import { createBoardSeoReader } from './board-seo-cache-core';

/**
 * The root shell and every page fn's canonical-origin read ask for
 * `board.seo()`; a settled read is reused for the window, and no caller ever
 * waits on another request's in-flight read.
 */
function reader(getBoardSeo: () => Promise<{ canonicalBase: string }>) {
  return createBoardSeoReader(
    { getBoardSeo, getDataSource: () => 'board', now: () => 0 },
    30_000,
  ).readBoardSeo;
}

describe('createBoardSeoReader', () => {
  it('reuses a settled read for later callers in the window', async () => {
    const seo = vi.fn(async () => ({
      canonicalBase: 'https://careers.acme.com',
    }));
    const readBoardSeo = reader(seo);

    const a = await readBoardSeo();
    const b = await readBoardSeo();

    expect(seo).toHaveBeenCalledTimes(1);
    expect(b).toBe(a);
  });

  it('never makes a later caller wait on a read that never settles', async () => {
    const seo = vi
      .fn<() => Promise<{ canonicalBase: string }>>()
      .mockImplementationOnce(() => new Promise(() => {}))
      .mockResolvedValueOnce({ canonicalBase: 'https://careers.acme.com' });
    const readBoardSeo = reader(seo);
    void readBoardSeo();

    await expect(readBoardSeo()).resolves.toEqual({
      canonicalBase: 'https://careers.acme.com',
    });
    expect(seo).toHaveBeenCalledTimes(2);
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
