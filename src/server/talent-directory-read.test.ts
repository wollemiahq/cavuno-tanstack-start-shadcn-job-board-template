import { BoardApiError } from '@cavuno/board';
import { describe, expect, it } from 'vitest';

import { readTalentDirectory } from './talent-directory-read';

function apiError(status: number, code: string) {
  return new BoardApiError({
    status,
    code,
    message: code,
    raw: { error: { code } },
  });
}

describe('readTalentDirectory', () => {
  it('turns the expected employer-only response into serializable route state', async () => {
    await expect(
      readTalentDirectory(() =>
        Promise.reject(apiError(403, 'talent_directory_restricted')),
      ),
    ).resolves.toEqual({ status: 'restricted' });
  });

  it('preserves successful pages and unrelated errors', async () => {
    const page = { data: [{ handle: 'ada' }], hasMore: false };
    await expect(
      readTalentDirectory(() => Promise.resolve(page)),
    ).resolves.toEqual({ status: 'available', page });

    const error = apiError(403, 'auth_forbidden');
    await expect(readTalentDirectory(() => Promise.reject(error))).rejects.toBe(
      error,
    );
  });
});
