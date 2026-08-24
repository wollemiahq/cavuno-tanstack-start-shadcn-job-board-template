import { describe, expect, it, vi } from 'vitest';

import { requireVerifiedBoardUserUsing } from './me-verification';

interface TestBoardUser {
  id: string;
  role: 'candidate' | 'employer';
  emailVerified: boolean;
}

const retrieve =
  vi.fn<(headers: Record<string, string>) => Promise<TestBoardUser>>();

describe('requireVerifiedBoardUser', () => {
  it('rejects an unverified user before a caller touches protected me data', async () => {
    retrieve.mockResolvedValue({
      id: 'user-1',
      role: 'employer',
      emailVerified: false,
    });

    await expect(
      requireVerifiedBoardUserUsing(retrieve, {
        authorization: 'Bearer token',
      }),
    ).rejects.toThrow('EMAIL_UNVERIFIED');
  });

  it('returns the fresh board user when email is verified', async () => {
    const user: TestBoardUser = {
      id: 'user-1',
      role: 'candidate',
      emailVerified: true,
    };
    retrieve.mockResolvedValue(user);

    await expect(
      requireVerifiedBoardUserUsing(retrieve, {
        authorization: 'Bearer token',
      }),
    ).resolves.toBe(user);
  });
});
