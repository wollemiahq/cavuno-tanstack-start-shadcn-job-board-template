import { isRedirect } from '@tanstack/react-router';
import { describe, expect, it, vi } from 'vitest';

import {
  redirectIfAuthenticatedUsing,
  type SessionUserLoader,
} from './auth-guard';

const getSessionUser = vi.fn<SessionUserLoader>();

describe('redirectIfAuthenticated', () => {
  it('bounces a signed-in visitor to the returnTo destination', async () => {
    getSessionUser.mockResolvedValue({ id: 'user-1' });
    let result: unknown;
    try {
      await redirectIfAuthenticatedUsing(getSessionUser, '/account');
    } catch (error) {
      result = error;
    }
    expect(isRedirect(result)).toBe(true);
    if (!isRedirect(result)) return;
    expect(result.options.href).toBe('/account');
  });

  it('lets a signed-out visitor stay on the auth page', async () => {
    getSessionUser.mockResolvedValue(null);
    await expect(
      redirectIfAuthenticatedUsing(getSessionUser, '/account'),
    ).resolves.toBeUndefined();
  });

  it('treats a failed session probe as signed-out', async () => {
    getSessionUser.mockRejectedValue(new Error('network'));
    await expect(
      redirectIfAuthenticatedUsing(getSessionUser, '/'),
    ).resolves.toBeUndefined();
  });
});
