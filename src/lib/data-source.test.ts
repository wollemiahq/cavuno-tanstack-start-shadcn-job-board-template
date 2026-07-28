import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Dual-source selection (DMO-01 / CAV-531): the data-source cookie picks
 * which publishable key the request's board client + session cookie use.
 * When CAVUNO_DEMO_BOARD is absent, every path stays on the primary board
 * regardless of cookie value (byte-compat with pre-dual-source deploys).
 */

const envState = vi.hoisted(() => ({
  apiUrl: 'https://api.example.test',
  board: 'pk_primary',
  demoBoard: undefined as string | undefined,
  demoBoardPrivate: false,
}));

const requestState = vi.hoisted(() => ({
  cookie: null as string | null,
}));

vi.mock('cloudflare:workers', () => ({
  env: {},
}));

vi.mock('./env', () => ({
  getServerEnv: () => ({
    apiUrl: envState.apiUrl,
    board: envState.board,
    demoBoard: envState.demoBoard,
    demoBoardPrivate: envState.demoBoardPrivate,
  }),
}));

vi.mock('@tanstack/react-start/server', () => ({
  getRequestHeader: (name: string) =>
    name.toLowerCase() === 'cookie' ? requestState.cookie : null,
}));

import {
  DATA_SOURCE_COOKIE,
  parseDataSourceCookie,
  resolveDataSource,
  serializeDataSourceCookie,
} from './data-source';
import {
  getDataSource,
  isDemoBoardConfigured,
  isDemoBoardPrivate,
  sessionCookieOptionsFor,
} from './data-source.server';

beforeEach(() => {
  envState.demoBoard = undefined;
  envState.demoBoardPrivate = false;
  requestState.cookie = null;
});

describe('resolveDataSource / getDataSource (T1)', () => {
  it('env absent ⇒ getDataSource() is board even with cookie demo', () => {
    envState.demoBoard = undefined;
    requestState.cookie = `${DATA_SOURCE_COOKIE}=demo`;
    expect(isDemoBoardConfigured()).toBe(false);
    expect(getDataSource()).toBe('board');
    expect(resolveDataSource(`${DATA_SOURCE_COOKIE}=demo`, false)).toBe(
      'board',
    );
  });

  it('demo key set + cookie demo ⇒ demo; board/absent ⇒ board', () => {
    envState.demoBoard = 'pk_demo';
    expect(isDemoBoardConfigured()).toBe(true);

    expect(resolveDataSource(`${DATA_SOURCE_COOKIE}=demo`, true)).toBe('demo');
    expect(resolveDataSource(`${DATA_SOURCE_COOKIE}=board`, true)).toBe(
      'board',
    );
    expect(resolveDataSource(null, true)).toBe('board');
    expect(resolveDataSource('', true)).toBe('board');
  });

  it('isDemoBoardPrivate tracks CAVUNO_DEMO_BOARD_PRIVATE', () => {
    envState.demoBoardPrivate = false;
    expect(isDemoBoardPrivate()).toBe(false);
    envState.demoBoardPrivate = true;
    expect(isDemoBoardPrivate()).toBe(true);
  });
});

describe('data-source cookie codec', () => {
  it('parse/serialize round-trip with Path=/ and SameSite=Lax', () => {
    const header = serializeDataSourceCookie('demo');
    expect(header).toContain(`${DATA_SOURCE_COOKIE}=demo`);
    expect(header).toMatch(/Path=\//i);
    expect(header).toMatch(/SameSite=Lax/i);
    expect(parseDataSourceCookie(header)).toBe('demo');
    expect(parseDataSourceCookie(`${DATA_SOURCE_COOKIE}=board; Path=/`)).toBe(
      'board',
    );
    expect(parseDataSourceCookie('other=1')).toBeNull();
  });
});

describe('sessionCookieOptionsFor (T3 names differ per source)', () => {
  it('demo source scopes the session cookie by the demo board key', () => {
    envState.demoBoard = 'pk_demo_tenant';
    expect(sessionCookieOptionsFor('demo')).toEqual({
      board: 'pk_demo_tenant',
    });
    // Primary stays unscoped so pre-dual-source cookie names are unchanged.
    expect(sessionCookieOptionsFor('board')).toEqual({});
  });

  it('demo source without a configured demo key falls back to unscoped', () => {
    envState.demoBoard = undefined;
    expect(sessionCookieOptionsFor('demo')).toEqual({});
  });
});
