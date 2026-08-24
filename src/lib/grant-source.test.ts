import { grantCookieName } from '@cavuno/board/server';
import { beforeEach, describe, expect, it } from 'vitest';

import { createDataSourceRuntime } from './data-source-runtime';

/**
 * F2 — grant cookies scoped per data source (mirror session isolation).
 * Writing a grant on the board source must leave the demo grant cookie
 * untouched and vice versa.
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
  clearGrantForSource,
  parseGrantForSource,
  serializeGrantForSource,
  sessionCookieOptionsFor,
} = createDataSourceRuntime({
  getServerEnv: () => envState,
  getRequestHeader: () => null,
  setResponseHeader: () => {},
});

beforeEach(() => {
  envState.demoBoard = 'pk_demo';
});

describe('tenant-scoped grant cookies (F2)', () => {
  it('grant cookie names differ per source', () => {
    const boardName = grantCookieName(sessionCookieOptionsFor('board').board);
    const demoName = grantCookieName(sessionCookieOptionsFor('demo').board);
    expect(boardName).toBe('__Host-cavuno_board_access');
    expect(demoName).not.toBe(boardName);
    expect(demoName).toContain('__Host-cavuno_board_access_');
  });

  it('writing a grant on the board source leaves the demo grant cookie untouched (and vice versa)', () => {
    const boardSet = serializeGrantForSource('grant-token-board', 'board');
    const demoSet = serializeGrantForSource('grant-token-demo', 'demo');
    const boardPair = boardSet.split(';')[0]!;
    const demoPair = demoSet.split(';')[0]!;

    expect(demoPair).not.toBe(boardPair);
    expect(demoSet).not.toContain('grant-token-board');
    expect(boardSet).not.toContain('grant-token-demo');

    const combined = `${boardPair}; ${demoPair}`;
    expect(parseGrantForSource(combined, 'board')).toBe('grant-token-board');
    expect(parseGrantForSource(combined, 'demo')).toBe('grant-token-demo');

    const clearDemo = clearGrantForSource('demo');
    expect(
      clearDemo.startsWith(
        grantCookieName(sessionCookieOptionsFor('demo').board),
      ),
    ).toBe(true);
    expect(clearDemo).not.toMatch(/^__Host-cavuno_board_access=;/);
  });
});
