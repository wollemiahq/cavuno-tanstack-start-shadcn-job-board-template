import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  retrieve: vi.fn(),
}));

vi.mock('../lib/board', () => ({
  getBoard: () => ({
    me: {
      retrieve: mocks.retrieve,
    },
  }),
}));

import { requireVerifiedBoardUser } from './me-verification';

afterEach(() => {
  vi.clearAllMocks();
});

describe('requireVerifiedBoardUser', () => {
  it('rejects an unverified user before a caller touches protected me data', async () => {
    mocks.retrieve.mockResolvedValue({
      id: 'user-1',
      role: 'employer',
      emailVerified: false,
    });

    await expect(
      requireVerifiedBoardUser({ authorization: 'Bearer token' }),
    ).rejects.toThrow('EMAIL_UNVERIFIED');
  });

  it('returns the fresh board user when email is verified', async () => {
    const user = {
      id: 'user-1',
      role: 'candidate',
      emailVerified: true,
    };
    mocks.retrieve.mockResolvedValue(user);

    await expect(
      requireVerifiedBoardUser({ authorization: 'Bearer token' }),
    ).resolves.toBe(user);
  });
});
