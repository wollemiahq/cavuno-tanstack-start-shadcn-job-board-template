import { BoardApiError } from '@cavuno/board';
import { isRedirect } from '@tanstack/react-router';
import { describe, expect, it, vi } from 'vitest';

import {
  classifyGatedReadError,
  gatedReadUsing,
  type GatedReadRecovery,
} from './board-access';

import type { BoardAccessContext } from '@/lib/board-access-middleware';

const CONTEXT: BoardAccessContext = {
  boardAccessHeaders: {
    authorization: 'Bearer stale',
    'x-board-access': 'grant',
  },
  currentPath: '/account',
};

function boardApiError(code: string, status = 401) {
  return new BoardApiError({ status, code, message: code, raw: {} });
}

function effectsWith(accessToken: string | null) {
  return {
    refreshSession: vi.fn(async () => accessToken),
    clearSession: vi.fn(),
  };
}

describe('classifyGatedReadError', () => {
  const cases: Array<[string, GatedReadRecovery]> = [
    ['board_password_required', 'password_wall'],
    // Both bearer refusals take the same path. Neither code proves the SESSION
    // is dead: `invalid_token` is also raised for a bad signature or a wrong
    // iss/aud, and refresh tokens are opaque, so a key rotation fails every
    // access token while every refresh token still works.
    ['board_auth_invalid_token', 'dead_bearer'],
    ['board_auth_token_expired', 'dead_bearer'],
    ['job_not_found', null],
  ];

  it.each(cases)('classifies %s as %s', (code, expected) => {
    expect(classifyGatedReadError(boardApiError(code))).toBe(expected);
  });

  it('classifies a non-API error as unrecoverable', () => {
    expect(classifyGatedReadError(new Error('network down'))).toBeNull();
    expect(classifyGatedReadError(null)).toBeNull();
  });
});

describe('gatedReadUsing', () => {
  it('returns the read result and touches nothing on success', async () => {
    const effects = effectsWith('fresh');

    const result = await gatedReadUsing(
      CONTEXT,
      async (headers) => headers['authorization'],
      effects,
    );

    expect(result).toBe('Bearer stale');
    expect(effects.refreshSession).not.toHaveBeenCalled();
    expect(effects.clearSession).not.toHaveBeenCalled();
  });

  // The mass-sign-out guard. A rotated board signing key refuses every access
  // token with `board_auth_invalid_token` while refresh tokens still rotate
  // cleanly; clearing the cookie here would discard a working refresh token and
  // sign out the whole board.
  it('rotates the bearer and retries, keeping the session, when refresh works', async () => {
    const effects = effectsWith('fresh');
    const seen: Array<Record<string, string>> = [];

    const result = await gatedReadUsing(
      CONTEXT,
      async (headers) => {
        seen.push(headers);
        if (headers['authorization'] === 'Bearer stale') {
          throw boardApiError('board_auth_invalid_token');
        }
        return 'ok';
      },
      effects,
    );

    expect(result).toBe('ok');
    expect(effects.refreshSession).toHaveBeenCalledOnce();
    expect(effects.clearSession).not.toHaveBeenCalled();
    expect(seen[1]?.['authorization']).toBe('Bearer fresh');
    // The password grant has to survive the retry, or a walled board would
    // trade a bearer failure for a password-wall bounce.
    expect(seen[1]?.['x-board-access']).toBe('grant');
  });

  // Only a FAILED rotation proves the session is dead.
  it('clears the session and throws UNAUTHENTICATED when refresh fails', async () => {
    const effects = effectsWith(null);

    const thrown = await gatedReadUsing(
      CONTEXT,
      () => Promise.reject(boardApiError('board_auth_invalid_token')),
      effects,
    ).catch((error: Error) => error);

    expect(effects.refreshSession).toHaveBeenCalledOnce();
    expect(effects.clearSession).toHaveBeenCalledOnce();
    // The same message `requireSessionMiddleware` throws for a viewer with no
    // session, so every gated route's existing `candidateLoaderError` catch
    // redirects to sign-in using the route's OWN returnTo. Deliberately not a
    // redirect from here: `gatedRead` also serves public page loaders, which
    // must never be bounced to sign-in.
    expect(isRedirect(thrown)).toBe(false);
    expect(thrown.message).toBe('UNAUTHENTICATED');
  });

  it('reads only once more when the retry also fails', async () => {
    const effects = effectsWith('fresh');
    const read = vi.fn(() =>
      Promise.reject(boardApiError('board_auth_invalid_token')),
    );

    await expect(gatedReadUsing(CONTEXT, read, effects)).rejects.toThrow();

    // One original + one retry. A retry loop would burn refresh tokens.
    expect(read).toHaveBeenCalledTimes(2);
    expect(effects.refreshSession).toHaveBeenCalledOnce();
  });

  it('redirects to the password wall without refreshing or clearing', async () => {
    const effects = effectsWith('fresh');

    let thrown: unknown;
    try {
      await gatedReadUsing(
        CONTEXT,
        () => Promise.reject(boardApiError('board_password_required')),
        effects,
      );
    } catch (error) {
      thrown = error;
    }

    // A walled board is not an auth failure — rotating or dropping the session
    // here would lose a good one behind the password challenge.
    expect(effects.refreshSession).not.toHaveBeenCalled();
    expect(effects.clearSession).not.toHaveBeenCalled();
    expect(isRedirect(thrown)).toBe(true);
    if (!isRedirect(thrown)) return;
    expect(thrown.options.to).toBe('/password');
  });

  it('propagates an unrecoverable error unchanged, session intact', async () => {
    const effects = effectsWith('fresh');
    const error = boardApiError('job_not_found', 404);

    await expect(
      gatedReadUsing(CONTEXT, () => Promise.reject(error), effects),
    ).rejects.toBe(error);
    expect(effects.refreshSession).not.toHaveBeenCalled();
    expect(effects.clearSession).not.toHaveBeenCalled();
  });
});
