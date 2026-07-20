import { isRedirect } from '@tanstack/react-router';
import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ getSessionUser: vi.fn() }));

vi.mock('../server/account', () => ({ getSessionUser: mocks.getSessionUser }));

import { redirectIfAuthenticated } from './auth-guard';

describe('redirectIfAuthenticated', () => {
  it('bounces a signed-in visitor to the returnTo destination', async () => {
    mocks.getSessionUser.mockResolvedValue({ id: 'user-1' });
    let result: unknown;
    try {
      await redirectIfAuthenticated('/account');
    } catch (error) {
      result = error;
    }
    expect(isRedirect(result)).toBe(true);
    if (!isRedirect(result)) return;
    expect(result.options.href).toBe('/account');
  });

  it('lets a signed-out visitor stay on the auth page', async () => {
    mocks.getSessionUser.mockResolvedValue(null);
    await expect(redirectIfAuthenticated('/account')).resolves.toBeUndefined();
  });

  it('treats a failed session probe as signed-out', async () => {
    mocks.getSessionUser.mockRejectedValue(new Error('network'));
    await expect(redirectIfAuthenticated('/')).resolves.toBeUndefined();
  });
});
