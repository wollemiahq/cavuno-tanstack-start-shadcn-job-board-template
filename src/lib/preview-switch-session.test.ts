import { sessionCookieName, type BoardSession } from '@cavuno/board/server';
import { beforeEach, describe, expect, it } from 'vitest';

import { createDataSourceRuntime } from './data-source-runtime';

/**
 * T6 — switchPersona stores the session under the demo cookie name when a
 * demo key is configured. The store path is the pure
 * `serializeSessionForSource(session, previewSessionSource())` seam used by
 * `src/server/preview.ts` (credentials never reach the browser; only the
 * cookie identity is under test here).
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
  demoBoard: undefined,
  demoBoardPrivate: false,
};

const {
  previewSessionSource,
  serializeSessionForSource,
  sessionCookieOptionsFor,
} = createDataSourceRuntime({
  getServerEnv: () => envState,
  getRequestHeader: () => null,
  setResponseHeader: () => {},
});

beforeEach(() => {
  envState.demoBoard = undefined;
});

describe('switchPersona session store (T6)', () => {
  const session: BoardSession = {
    accessToken: 'persona-access',
    refreshToken: 'persona-refresh',
    expiresAt: 1_800_000_000_000,
  };

  it('targets the demo cookie name when a demo key is configured', () => {
    envState.demoBoard = 'pk_demo';
    expect(previewSessionSource()).toBe('demo');
    const setCookie = serializeSessionForSource(
      session,
      previewSessionSource(),
    );
    const demoName = sessionCookieName(sessionCookieOptionsFor('demo').board);
    expect(setCookie.startsWith(`${demoName}=`)).toBe(true);
    expect(setCookie).toContain('persona-access');
    // Never the unscoped primary cookie.
    expect(setCookie.startsWith('__Host-cavuno_board_session=')).toBe(false);
  });

  it('falls back to the primary cookie when no demo key (legacy sandbox)', () => {
    envState.demoBoard = undefined;
    expect(previewSessionSource()).toBe('board');
    const setCookie = serializeSessionForSource(
      session,
      previewSessionSource(),
    );
    expect(setCookie.startsWith('__Host-cavuno_board_session=')).toBe(true);
  });
});
