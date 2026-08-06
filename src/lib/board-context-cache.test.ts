import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The board context is read 2-3x per document (root shell + each page's
 * `seoBase()`), and every read was a real upstream round trip — the comment
 * claiming the SDK client cached it was wrong. These pin the memo that
 * replaced it: one upstream call per TTL window, kept apart per data source
 * (the preview/demo cookie can point requests at a DIFFERENT board in the
 * same process), and a failure that is never retained.
 */

const { contextSpy, dataSource } = vi.hoisted(() => ({
  contextSpy: vi.fn(),
  dataSource: { current: 'primary' as 'primary' | 'demo' },
}));

vi.mock('./board', () => ({
  getBoard: () => ({ context: contextSpy }),
}));

vi.mock('./data-source.server', () => ({
  getDataSource: () => dataSource.current,
}));

vi.mock('./read-cache', () => ({
  boardGlobalReadCache: () => ({
    cf: { cacheTtl: 300, cacheEverything: true },
  }),
}));

const { readBoardContext, resetBoardContextCache } =
  await import('./board-context-cache');

beforeEach(() => {
  vi.useFakeTimers();
  contextSpy.mockReset();
  contextSpy.mockImplementation(async () => ({ name: 'Sandbox' }));
  dataSource.current = 'primary';
  resetBoardContextCache();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('board context memo', () => {
  it('collapses the repeat reads of one document into a single fetch', async () => {
    // root shell + a page's seoBase(), same request
    await Promise.all([readBoardContext(), readBoardContext()]);
    await readBoardContext();
    expect(contextSpy).toHaveBeenCalledTimes(1);
  });

  it('re-reads once the TTL window closes', async () => {
    await readBoardContext();
    vi.advanceTimersByTime(31_000);
    await readBoardContext();
    expect(contextSpy).toHaveBeenCalledTimes(2);
  });

  it('never serves one data source the other board context', async () => {
    contextSpy.mockImplementation(async () => ({
      name: dataSource.current === 'demo' ? 'Demo board' : 'Primary board',
    }));

    const primary = await readBoardContext();
    dataSource.current = 'demo';
    const demo = await readBoardContext();

    expect(primary).toEqual({ name: 'Primary board' });
    expect(demo).toEqual({ name: 'Demo board' });
    expect(contextSpy).toHaveBeenCalledTimes(2);
  });

  it('does not pin a failure for the whole window', async () => {
    contextSpy.mockRejectedValueOnce(new Error('upstream down'));
    await expect(readBoardContext()).rejects.toThrow('upstream down');

    // Same window: the next caller must retry rather than inherit the failure.
    contextSpy.mockImplementation(async () => ({ name: 'Sandbox' }));
    await expect(readBoardContext()).resolves.toEqual({ name: 'Sandbox' });
    expect(contextSpy).toHaveBeenCalledTimes(2);
  });

  it('tags the read for the long board-global edge TTL', async () => {
    await readBoardContext();
    expect(contextSpy).toHaveBeenCalledWith({
      cf: { cacheTtl: 300, cacheEverything: true },
    });
  });
});
