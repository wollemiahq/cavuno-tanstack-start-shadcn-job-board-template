import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The board context is read 2-3x per document (root shell + each page's
 * `seoBase()`), and every read was a real upstream round trip — the comment
 * claiming the SDK client cached it was wrong. These pin the memo that
 * replaced it: one upstream call per TTL window, kept apart per data source
 * (the preview/demo cookie can point requests at a DIFFERENT board in the
 * same process), and a failure that is never retained.
 */

interface DataSourceState {
  current: 'primary' | 'demo';
}

import { createBoardContextCache } from './board-context-cache-core';

const contextSpy = vi.fn();
const dataSource: DataSourceState = { current: 'primary' };
const {
  readBoardContext,
  readEmployerOfferGate,
  resetBoardContextCache,
  resetEmployerOfferGateCache,
} = createBoardContextCache(
  {
    getBoardContext: () =>
      contextSpy({ cf: { cacheTtl: 300, cacheEverything: true } }),
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

describe('employer offer gate memo', () => {
  it('collapses repeat root-shell gate reads into one load', async () => {
    const load = vi.fn().mockResolvedValue({ hasEmployerOfferPage: true });

    await Promise.all([
      readEmployerOfferGate(load),
      readEmployerOfferGate(load),
    ]);
    await readEmployerOfferGate(load);

    expect(load).toHaveBeenCalledTimes(1);
    await expect(readEmployerOfferGate(load)).resolves.toEqual({
      hasEmployerOfferPage: true,
    });
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
