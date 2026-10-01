import { describe, expect, it } from 'vitest';

import { createSettledCache } from './settled-cache';

/**
 * The one cross-request cache primitive. It must only ever hold settled
 * values: a pending promise in module scope is how a cancelled request hung
 * every later request in its isolate (2026-10-02).
 */
function cache(options: { maxEntries?: number } = {}) {
  const clock = { now: 0 };
  return {
    clock,
    cache: createSettledCache<string, string>({
      ttlMs: 1_000,
      now: () => clock.now,
      ...options,
    }),
  };
}

describe('createSettledCache', () => {
  it('serves a value inside the TTL and only stale reads after it', () => {
    const { clock, cache: memo } = cache();
    memo.set('board', 'v1');

    clock.now = 999;
    expect(memo.get('board')).toBe('v1');
    clock.now = 1_000;
    expect(memo.get('board')).toBeUndefined();
    expect(memo.getStale('board')).toBe('v1');
  });

  it('keeps the value from the newer read when an older one lands late', () => {
    const { clock, cache: memo } = cache();
    clock.now = 10;
    memo.set('board', 'fresh', 5);
    memo.set('board', 'stale', 1);

    expect(memo.get('board')).toBe('fresh');
  });

  it('drops the oldest key past maxEntries', () => {
    const { cache: memo } = cache({ maxEntries: 2 });
    memo.set('a', '1');
    memo.set('b', '2');
    memo.set('c', '3');

    expect(memo.getStale('a')).toBeUndefined();
    expect(memo.get('b')).toBe('2');
    expect(memo.get('c')).toBe('3');
  });

  it('refuses a promise, Response, or stream', () => {
    const memo = createSettledCache<string, unknown>({ ttlMs: 1_000 });

    expect(() => memo.set('a', new Promise(() => {}))).toThrow(TypeError);
    expect(() => memo.set('a', new Response('x'))).toThrow(TypeError);
    expect(() => memo.set('a', new ReadableStream())).toThrow(TypeError);
    expect(memo.getStale('a')).toBeUndefined();
  });
});
