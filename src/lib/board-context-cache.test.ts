import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The board context is read 2-3x per document (root shell + each page's
 * `seoBase()`), and every read was a real upstream round trip — the comment
 * claiming the SDK client cached it was wrong. These pin the memo that
 * replaced it: a settled value reused for the TTL window, kept apart per data
 * source (the preview/demo cookie can point requests at a DIFFERENT board in
 * the same process), a failure that is never retained, and no request ever
 * waiting on another request's in-flight read.
 */

interface DataSourceState {
  current: 'primary' | 'demo';
}

import { createBoardContextCache } from './board-context-cache-core';

const contextSpy = vi.fn();
const dataSource: DataSourceState = { current: 'primary' };
const {
  readBoardContext,
  refreshBoardContext,
  readStaleBoardContext,
  readEmployerOfferGate,
  resetBoardContextCache,
  resetEmployerOfferGateCache,
} = createBoardContextCache(
  {
    getBoardContext: () =>
      contextSpy({ cf: { cacheTtl: 300, cacheEverything: true } }),
    getFreshBoardContext: () => contextSpy({ cache: 'no-store' }),
    getDataSource: () => (dataSource.current === 'primary' ? 'board' : 'demo'),
    now: () => Date.now(),
  },
  30_000,
);

beforeEach(() => {
  vi.useFakeTimers();
  contextSpy.mockReset();
  contextSpy.mockImplementation(async () => ({ name: 'Sandbox' }));
  dataSource.current = 'primary';
  resetBoardContextCache();
  resetEmployerOfferGateCache();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('board context memo', () => {
  it('reuses a settled read for the rest of the window', async () => {
    await readBoardContext();
    await readBoardContext();
    expect(contextSpy).toHaveBeenCalledTimes(1);
  });

  it('never makes a later request wait on a read that never settles', async () => {
    // The first request was cancelled mid-fetch, so its read never settles.
    contextSpy.mockImplementationOnce(() => new Promise(() => {}));
    void readBoardContext();

    await expect(readBoardContext()).resolves.toEqual({ name: 'Sandbox' });
    expect(contextSpy).toHaveBeenCalledTimes(2);
  });

  it('never makes a later request wait on a fresh probe that never settles', async () => {
    contextSpy.mockImplementationOnce(() => new Promise(() => {}));
    void refreshBoardContext();

    await expect(refreshBoardContext()).resolves.toEqual({ name: 'Sandbox' });
    expect(contextSpy).toHaveBeenCalledTimes(2);
  });

  it('keeps a fresh probe when an older read settles after it', async () => {
    let resolveSlow!: (value: { name: string }) => void;
    contextSpy.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveSlow = resolve;
        }),
    );
    const slow = readBoardContext();
    vi.advanceTimersByTime(1);
    contextSpy.mockResolvedValueOnce({ name: 'Fresh' });
    await refreshBoardContext();

    resolveSlow({ name: 'Stale' });
    await slow;
    await expect(readBoardContext()).resolves.toEqual({ name: 'Fresh' });
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

  it('a fresh kill-switch read bypasses caches and replaces the memo', async () => {
    contextSpy.mockResolvedValueOnce({
      features: { jobRecommendationsEnabled: true },
    });
    await readBoardContext();

    contextSpy.mockResolvedValueOnce({
      features: { jobRecommendationsEnabled: false },
    });
    await expect(refreshBoardContext()).resolves.toEqual({
      features: { jobRecommendationsEnabled: false },
    });

    await expect(readBoardContext()).resolves.toEqual({
      features: { jobRecommendationsEnabled: false },
    });
    expect(contextSpy).toHaveBeenCalledTimes(2);
    expect(contextSpy).toHaveBeenLastCalledWith({ cache: 'no-store' });
  });

  it('retains the last successful memo when a fresh kill-switch read fails', async () => {
    const previous = {
      features: { jobRecommendationsEnabled: true },
    };
    contextSpy.mockResolvedValueOnce(previous);
    await readBoardContext();

    contextSpy.mockRejectedValueOnce(new Error('fresh read unavailable'));
    await expect(refreshBoardContext()).rejects.toThrow(
      'fresh read unavailable',
    );

    await expect(readStaleBoardContext()).resolves.toEqual(previous);
    expect(contextSpy).toHaveBeenCalledTimes(2);
  });

  it('keeps sibling reads on the stable memo while a fresh probe is in flight', async () => {
    const previous = {
      features: { jobRecommendationsEnabled: true },
    };
    contextSpy.mockResolvedValueOnce(previous);
    await readBoardContext();

    let rejectFresh!: (error: Error) => void;
    contextSpy.mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          rejectFresh = reject;
        }),
    );
    const refresh = refreshBoardContext();

    await expect(readBoardContext()).resolves.toEqual(previous);
    rejectFresh(new Error('fresh read unavailable'));
    await expect(refresh).rejects.toThrow('fresh read unavailable');
    await expect(readStaleBoardContext()).resolves.toEqual(previous);
  });
});

describe('employer offer gate memo', () => {
  it('reuses a settled gate across root-shell reads', async () => {
    const load = vi.fn().mockResolvedValue({ hasEmployerOfferPage: true });

    await readEmployerOfferGate(load);
    await readEmployerOfferGate(load);

    expect(load).toHaveBeenCalledTimes(1);
    await expect(readEmployerOfferGate(load)).resolves.toEqual({
      hasEmployerOfferPage: true,
    });
  });

  it('does not keep a failed load', async () => {
    const load = vi
      .fn()
      .mockRejectedValueOnce(new Error('plans down'))
      .mockResolvedValueOnce({ hasEmployerOfferPage: true });

    await expect(readEmployerOfferGate(load)).rejects.toThrow('plans down');
    await expect(readEmployerOfferGate(load)).resolves.toEqual({
      hasEmployerOfferPage: true,
    });
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('never makes a later request wait on a load that never settles', async () => {
    const load = vi
      .fn()
      .mockImplementationOnce(() => new Promise(() => {}))
      .mockResolvedValueOnce({ hasEmployerOfferPage: true });
    void readEmployerOfferGate(load);

    await expect(readEmployerOfferGate(load)).resolves.toEqual({
      hasEmployerOfferPage: true,
    });
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('keeps primary and demo data sources apart', async () => {
    const load = vi.fn().mockImplementation(async () => ({
      hasEmployerOfferPage: dataSource.current === 'demo',
    }));

    const primary = await readEmployerOfferGate(load);
    dataSource.current = 'demo';
    const demo = await readEmployerOfferGate(load);

    expect(primary).toEqual({ hasEmployerOfferPage: false });
    expect(demo).toEqual({ hasEmployerOfferPage: true });
    expect(load).toHaveBeenCalledTimes(2);
  });
});
