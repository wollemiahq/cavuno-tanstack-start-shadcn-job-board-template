import { describe, expect, it, vi } from 'vitest';

import { coordinateSessionRefresh } from './session-refresh-coordinator';

import type { BoardSession } from '@cavuno/board/server';

const session: BoardSession = {
  accessToken: 'access-old',
  refreshToken: 'refresh-old',
  expiresAt: 1,
};

const rotated: BoardSession = {
  accessToken: 'access-new',
  refreshToken: 'refresh-new',
  expiresAt: 2,
};

describe('coordinateSessionRefresh', () => {
  it('does not start a refresh when sign-out has no refresh to join', async () => {
    const refresh = vi.fn();
    const coordinated = coordinateSessionRefresh(refresh);

    await expect(coordinated.beginSignOut(session)).resolves.toEqual(session);
    expect(refresh).not.toHaveBeenCalled();
    await expect(coordinated(session)).resolves.toBeNull();
  });

  it('joins an existing refresh and blocks later refreshes for that token', async () => {
    let resolveRefresh: ((value: BoardSession) => void) | undefined;
    const refresh = vi.fn(
      () =>
        new Promise<BoardSession>((resolve) => {
          resolveRefresh = resolve;
        }),
    );
    const coordinated = coordinateSessionRefresh(refresh);

    const activeRefresh = coordinated(session);
    const signOutSession = coordinated.beginSignOut(session);
    const blockedRefresh = coordinated(session);
    resolveRefresh?.(rotated);

    await expect(activeRefresh).resolves.toEqual(rotated);
    await expect(signOutSession).resolves.toEqual(rotated);
    await expect(blockedRefresh).resolves.toBeNull();
    expect(refresh).toHaveBeenCalledOnce();
  });
});
