import { describe, expect, it } from 'vitest';

import { BOARD_CONTEXT_FETCH_OPTIONS } from './board-context-cache';
import { applyReadCache } from './read-cache';

import type { BoardRequest } from '@cavuno/board';

/**
 * Pins the upstream fetch options the isolate memo hands the SDK. The
 * context carries the operator kill switches; if this read ever goes back
 * onto the shared edge cache, a flipped flag can outlive its TTL by hours
 * (the API edge rewrites Cache-Control to 14400s). See board-context-cache.ts.
 */
describe('board context memo fetch options', () => {
  it('reads the context with cache: no-store and no edge TTL', () => {
    expect(BOARD_CONTEXT_FETCH_OPTIONS).toEqual({ cache: 'no-store' });
    expect(BOARD_CONTEXT_FETCH_OPTIONS).not.toHaveProperty('cf');
  });

  it('survives the client onRequest hook without picking up a cf TTL', () => {
    const request: BoardRequest = {
      url: 'https://api.example.test/v1/boards/pk_x',
      init: {
        method: 'GET',
        headers: new Headers(),
        ...BOARD_CONTEXT_FETCH_OPTIONS,
      },
    };
    const out = applyReadCache(request);
    expect(out.init.cache).toBe('no-store');
    expect(out.init).not.toHaveProperty('cf');
  });
});
