import { describe, expect, it } from 'vitest';

import {
  READ_CACHE_TTL,
  applyReadCache,
  boardGlobalReadCache,
} from './read-cache';

/**
 * The edge-cache policy is a SECURITY seam: a shared, URL-keyed Cloudflare
 * cache must only ever hold the anonymous public view, and an authed/grant
 * read (or any mutation) must never read OR write it. These tests pin the
 * anonymous/authed split byte-for-byte so a future regression — serving an
 * authed viewer a cached anonymous body, or the reverse — cannot land
 * silently. See `read-cache.ts` for the invariant this locks.
 */
import type { BoardRequest } from '@cavuno/board';

/** Build a BoardRequest the way the SDK hands one to the `onRequest` hook. */
function req(
  method: string,
  headers: Record<string, string> = {},
  cf?: { cacheTtl?: number; cacheEverything?: boolean },
): BoardRequest {
  return {
    url: 'https://api.example.test/v1/jobs',
    init: {
      method,
      headers: new Headers(headers),
      ...(cf ? { cf } : {}),
    } as RequestInit,
  };
}

/** Read back the Workers-augmented init the hook mutates in place. */
function init(r: BoardRequest) {
  return r.init as RequestInit & {
    cache?: string;
    cf?: { cacheTtl?: number; cacheEverything?: boolean };
  };
}

describe('applyReadCache — the anonymous/authed edge-cache split', () => {
  it('anonymous GET (no bearer, no grant) → cacheEverything with the content TTL', () => {
    const r = applyReadCache(req('GET'));
    expect(init(r).cf).toEqual({
      cacheTtl: READ_CACHE_TTL.content,
      cacheEverything: true,
    });
    // Never no-store — the anonymous view is the one shared-cacheable body.
    expect(init(r).cache).toBeUndefined();
  });

  it('defaults the method to GET when the SDK omits it', () => {
    const r = applyReadCache({
      url: 'https://api.example.test/v1/jobs',
      init: { headers: new Headers() } as RequestInit,
    });
    expect(init(r).cf).toEqual({
      cacheTtl: READ_CACHE_TTL.content,
      cacheEverything: true,
    });
  });

  it('GET carrying an Authorization bearer → cache no-store, never cacheable', () => {
    const r = applyReadCache(
      req('GET', { authorization: 'Bearer abc.def.ghi' }),
    );
    expect(init(r).cache).toBe('no-store');
    expect(init(r).cf).toBeUndefined();
  });

  it('GET carrying the X-Board-Access grant → cache no-store, never cacheable', () => {
    const r = applyReadCache(req('GET', { 'x-board-access': 'grant-token' }));
    expect(init(r).cache).toBe('no-store');
    expect(init(r).cf).toBeUndefined();
  });

  it('treats the identity headers case-insensitively (Headers normalizes)', () => {
    const bearer = applyReadCache(req('GET', { Authorization: 'Bearer x' }));
    expect(init(bearer).cache).toBe('no-store');
    const grant = applyReadCache(req('GET', { 'X-Board-Access': 'g' }));
    expect(init(grant).cache).toBe('no-store');
  });

  it.each(['POST', 'PUT', 'PATCH', 'DELETE'])(
    'mutation %s → cache no-store even when anonymous',
    (method) => {
      const r = applyReadCache(req(method));
      expect(init(r).cache).toBe('no-store');
      expect(init(r).cf).toBeUndefined();
    },
  );

  it('lowercase method verbs are normalized before the mutation check', () => {
    const r = applyReadCache(req('post'));
    expect(init(r).cache).toBe('no-store');
  });

  it('an authed mutation is still no-store (never cacheable)', () => {
    const r = applyReadCache(req('POST', { authorization: 'Bearer abc' }));
    expect(init(r).cache).toBe('no-store');
    expect(init(r).cf).toBeUndefined();
  });
});

describe('boardGlobalReadCache — the opt-in longer TTL, only where tagged', () => {
  it('tags a board-global read with the longer TTL', () => {
    expect(boardGlobalReadCache()).toEqual({
      cf: { cacheTtl: READ_CACHE_TTL.boardGlobal, cacheEverything: true },
    });
  });

  it('an anonymous GET already tagged board-global keeps the longer TTL', () => {
    // A call site pre-tagged the request; the hook must not clobber it back
    // down to the short content TTL.
    const r = applyReadCache(
      req(
        'GET',
        {},
        { cacheTtl: READ_CACHE_TTL.boardGlobal, cacheEverything: true },
      ),
    );
    expect(init(r).cf).toEqual({
      cacheTtl: READ_CACHE_TTL.boardGlobal,
      cacheEverything: true,
    });
  });

  it('the board-global TTL does NOT survive an authed read — it becomes no-store', () => {
    // Opt-in TTL applies ONLY to the anonymous path; identity always wins.
    const r = applyReadCache(
      req(
        'GET',
        { authorization: 'Bearer abc' },
        { cacheTtl: READ_CACHE_TTL.boardGlobal, cacheEverything: true },
      ),
    );
    expect(init(r).cache).toBe('no-store');
  });

  it('the two TTLs are distinct and positive', () => {
    expect(READ_CACHE_TTL.content).toBeGreaterThan(0);
    expect(READ_CACHE_TTL.boardGlobal).toBeGreaterThan(READ_CACHE_TTL.content);
  });
});
