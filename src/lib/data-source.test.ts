import { beforeEach, describe, expect, it } from 'vitest';

import {
  DATA_SOURCE_COOKIE,
  parseDataSourceCookie,
  resolveDataSource,
  serializeDataSourceCookie,
} from './data-source';
import { createDataSourceRuntime } from './data-source-runtime';

/**
 * Dual-source selection (DMO-01 / CAV-531): the data-source cookie picks
 * which publishable key the request's board client + session cookie use.
 * When CAVUNO_DEMO_BOARD is absent, every path stays on the primary board
 * regardless of cookie value (byte-compat with pre-dual-source deploys).
 */

interface EnvState {
  apiUrl: string;
  board: string;
  demoBoard: string | undefined;
  demoBoardPrivate: boolean;
}

interface RequestState {
  cookie: string | null;
}

const envState: EnvState = {
  apiUrl: 'https://api.example.test',
  board: 'pk_primary',
  demoBoard: undefined,
  demoBoardPrivate: false,
};

const requestState: RequestState = {
  cookie: null,
};

const {
  getDataSource,
  isDemoBoardConfigured,
  isDemoBoardPrivate,
  sessionCookieOptionsFor,
} = createDataSourceRuntime({
  getServerEnv: () => envState,
  getRequestHeader: (name) =>
    name.toLowerCase() === 'cookie' ? requestState.cookie : null,
  setResponseHeader: () => {},
});

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
