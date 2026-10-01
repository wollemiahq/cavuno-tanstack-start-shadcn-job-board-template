import { BoardApiError } from '@cavuno/board';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { guardRequiredSession } from './require-session-guard';

import type { BoardSession } from '@cavuno/board/server';

/**
 * A session-required server function whose cookie session the API revoked:
 * the client seam signs the viewer out and retries anonymously, the anonymous
 * retry is (correctly) a 401, and the required-session middleware turns that
 * into the same `UNAUTHENTICATED` signal a signed-out visitor gets, so
 * loaders redirect to sign-in instead of rendering the error boundary.
 */

const outcome =
  vi.fn<
    (source: string, token: string) => Promise<BoardSession | null> | undefined
  >();

const session: BoardSession = {
  accessToken: 'revoked',
  refreshToken: 'r',
  expiresAt: Date.now() + 60 * 60 * 1000,
};

function unauthorized() {
  return new BoardApiError({
    status: 401,
    code: 'auth_unauthenticated',
    message: 'Authentication required',
    raw: undefined,
  });
}

const context = {
  session,
  authHeaders: { authorization: 'Bearer revoked' },
  dataSource: 'board' as const,
};

beforeEach(() => {
  outcome.mockReset();
});

describe('requireSessionMiddleware after a revoked session', () => {
  it('signed out by recovery → UNAUTHENTICATED, like a signed-out visitor', async () => {
    outcome.mockReturnValue(Promise.resolve(null));

    await expect(
      guardRequiredSession(
        context,
        async () => {
          throw unauthorized();
        },
        outcome,
      ),
    ).rejects.toThrow('UNAUTHENTICATED');
    expect(outcome).toHaveBeenCalledWith('board', 'revoked');
  });

  it('no session at all → UNAUTHENTICATED without running the handler', async () => {
    const next = vi.fn(async () => 'ran');

    await expect(
      guardRequiredSession({ ...context, session: null }, next, outcome),
    ).rejects.toThrow('UNAUTHENTICATED');
    expect(next).not.toHaveBeenCalled();
  });

  it('no recovery happened → the original error propagates', async () => {
    outcome.mockReturnValue(undefined);
    const error = unauthorized();

    await expect(
      guardRequiredSession(
        context,
        async () => {
          throw error;
        },
        outcome,
      ),
    ).rejects.toBe(error);
  });

  it('success passes the result through', async () => {
    await expect(
      guardRequiredSession(context, async () => 'ok', outcome),
    ).resolves.toBe('ok');
  });
});
