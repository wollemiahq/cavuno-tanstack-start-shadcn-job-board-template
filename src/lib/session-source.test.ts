import { sessionCookieName, type BoardSession } from '@cavuno/board/server';
import { beforeEach, describe, expect, it } from 'vitest';

import { createDataSourceRuntime } from './data-source-runtime';

/**
 * Tenant-scoped session cookie isolation (T3): each data source reads and
 * writes ONLY its own cookie identity. Uses the real SDK codec so names
 * match production.
 */

interface EnvState {
  apiUrl: string;
  board: string;
  demoBoard: string | undefined;
  demoBoardPrivate: boolean;
}

const envState: EnvState = {
  apiUrl: 'https://api.example.test',
  board: 'pk_primary',
  demoBoard: 'pk_demo',
  demoBoardPrivate: false,
};

const {
  clearSessionForSource,
  parseSessionForSource,
  serializeSessionForSource,
  sessionCookieOptionsFor,
} = createDataSourceRuntime({
  getServerEnv: () => envState,
  getRequestHeader: () => null,
  setResponseHeader: () => {},
});

beforeEach(() => {
  envState.demoBoard = 'pk_demo';
});

describe('tenant-scoped session cookies (T3)', () => {
  const boardSession: BoardSession = {
    accessToken: 'atok-board',
    refreshToken: 'rtok-board',
    expiresAt: 1_700_000_000_000,
  };
  const demoSession: BoardSession = {
    accessToken: 'atok-demo',
    refreshToken: 'rtok-demo',
    expiresAt: 1_700_000_000_100,
  };

  it('session cookie names differ per source', () => {
    const boardOpts = sessionCookieOptionsFor('board');
    const demoOpts = sessionCookieOptionsFor('demo');
    const boardName = sessionCookieName(boardOpts.board);
    const demoName = sessionCookieName(demoOpts.board);
    expect(boardName).toBe('__Host-cavuno_board_session');
    expect(demoName).not.toBe(boardName);
    expect(demoName).toContain('__Host-cavuno_board_session_');
  });

  it('writing the demo session leaves the board session cookie untouched', () => {
    const boardSetCookie = serializeSessionForSource(boardSession, 'board');
    const demoSetCookie = serializeSessionForSource(demoSession, 'demo');
    const boardPair = boardSetCookie.split(';')[0]!;
    const demoPair = demoSetCookie.split(';')[0]!;

    expect(demoPair).not.toBe(boardPair);
    expect(demoSetCookie).not.toContain(boardSession.accessToken);
    expect(boardSetCookie).not.toContain(demoSession.accessToken);

    const combined = `${boardPair}; ${demoPair}`;
    expect(parseSessionForSource(combined, 'board')).toEqual(boardSession);
    expect(parseSessionForSource(combined, 'demo')).toEqual(demoSession);

    const clearDemo = clearSessionForSource('demo');
    expect(
      clearDemo.startsWith(
        sessionCookieName(sessionCookieOptionsFor('demo').board),
      ),
    ).toBe(true);
    // Clearing demo names only the demo cookie — never the primary name alone as a clear of primary.
    expect(clearDemo).not.toMatch(/^__Host-cavuno_board_session=;/);
  });
});
