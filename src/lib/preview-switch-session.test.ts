import { sessionCookieName, type BoardSession } from '@cavuno/board/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * T6 — switchPersona stores the session under the demo cookie name when a
 * demo key is configured. The store path is the pure
 * `serializeSessionForSource(session, previewSessionSource())` seam used by
 * `src/server/preview.ts` (credentials never reach the browser; only the
 * cookie identity is under test here).
 */

const envState = vi.hoisted(() => ({
  apiUrl: 'https://api.example.test',
  board: 'pk_primary',
  demoBoard: undefined as string | undefined,
  demoBoardPrivate: false,
}));

vi.mock('cloudflare:workers', () => ({ env: {} }));

vi.mock('./env', () => ({
  getServerEnv: () => ({
    apiUrl: envState.apiUrl,
    board: envState.board,
    demoBoard: envState.demoBoard,
    demoBoardPrivate: envState.demoBoardPrivate,
  }),
}));

vi.mock('@tanstack/react-start/server', () => ({
  getRequestHeader: () => null,
}));

import {
  previewSessionSource,
  serializeSessionForSource,
  sessionCookieOptionsFor,
} from './data-source.server';

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
