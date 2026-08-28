import { BoardApiError } from '@cavuno/board';
import { isRedirect } from '@tanstack/react-router';
import { describe, expect, it, vi } from 'vitest';

import {
  classifyGatedReadError,
  gatedReadUsing,
  type GatedReadRecovery,
} from './board-access';

import type { BoardAccessContext } from '@/lib/board-access-middleware';

/**
 * Gated-read recovery. Two 401s are recoverable and need opposite treatment,
 * and a third 401 must NOT be treated as either — which is the whole reason
 * the classification is matched on exact codes rather than on status.
 *
 * `board_auth_invalid_token` is the stranded session: the API will never accept
 * this bearer again (its board user is gone, or the `accountId`/`authVersion`
 * claims no longer match the live row). Before this recovery existed, the 401
 * escaped the loader and every gated page — /account, /settings, /saved-jobs,
 * /me/alerts — rendered its error component instead of bouncing to sign-in.
 * The route-level `candidateLoaderError` did not catch it either: that matches
 * only the literal `UNAUTHENTICATED` / `EMAIL_UNVERIFIED` messages, and a
 * stranded viewer's session middleware passes (the cookie is still there).
 */

const CONTEXT: BoardAccessContext = {
  boardAccessHeaders: { authorization: 'Bearer stranded' },
  currentPath: '/account',
};

function boardApiError(code: string, status = 401) {
  return new BoardApiError({
    status,
    code,
    message: 'Invalid or expired token',
    raw: {},
  });
}

function noEffects() {
  return { clearSession: vi.fn() };
}

/** Where a redirect points; a thrown TanStack redirect carries it on `.options`. */
interface RedirectTarget {
  to?: string;
  href?: string;
}

/**
 * Run a gated read that is expected to redirect and return where it points.
 * Fails loudly if it returns, or throws anything that is not a redirect — both
 * of which would mean the viewer sees an error page instead of a bounce.
 */
async function redirectTargetOf<T>(
  run: () => Promise<T>,
): Promise<RedirectTarget> {
  try {
    await run();
  } catch (error) {
    if (!isRedirect(error)) throw error;
    // SAFETY: `isRedirect` above confirms a TanStack redirect, which always
    // carries its target options under `.options`.
    return (error as { options: RedirectTarget }).options;
  }
  throw new Error('expected the gated read to redirect');
}

describe('classifyGatedReadError', () => {
  const cases: Array<[string, GatedReadRecovery]> = [
    ['board_password_required', 'password_wall'],
    ['board_auth_invalid_token', 'stranded_session'],
    // "Refresh or re-login will fix this" — the session middleware's rotation
    // window and `refreshSession` own it. Clearing the cookie here would sign
    // out a viewer whose refresh token is still good.
    ['board_auth_token_expired', null],
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
    const effects = noEffects();

    const result = await gatedReadUsing(
      CONTEXT,
      async (headers) => headers['authorization'],
      effects,
    );

    expect(result).toBe('Bearer stranded');
    expect(effects.clearSession).not.toHaveBeenCalled();
  });

  it('clears the session and redirects to sign-in on a stranded session', async () => {
    const effects = noEffects();

    const target = await redirectTargetOf(() =>
      gatedReadUsing(
        CONTEXT,
        () => Promise.reject(boardApiError('board_auth_invalid_token')),
        effects,
      ),
    );

    expect(effects.clearSession).toHaveBeenCalledOnce();
    // returnTo carries the page they were on, so the bounce is not a dead end.
    expect(target.href ?? '').toContain('/auth/sign-in');
    expect(target.href ?? '').toContain(
      `returnTo=${encodeURIComponent('/account')}`,
    );
  });

  it('redirects to the password wall WITHOUT clearing the session', async () => {
    const effects = noEffects();

    const target = await redirectTargetOf(() =>
      gatedReadUsing(
        CONTEXT,
        () => Promise.reject(boardApiError('board_password_required')),
        effects,
      ),
    );

    // A walled board is not an auth failure — signing the viewer out here
    // would lose a perfectly good session behind the password challenge.
    expect(effects.clearSession).not.toHaveBeenCalled();
    expect(target.to).toBe('/password');
  });

  it('propagates an unrecoverable error unchanged, session intact', async () => {
    const effects = noEffects();
    const error = boardApiError('board_auth_token_expired');

    await expect(
      gatedReadUsing(CONTEXT, () => Promise.reject(error), effects),
    ).rejects.toBe(error);
    expect(effects.clearSession).not.toHaveBeenCalled();
  });
});
