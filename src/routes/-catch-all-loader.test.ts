import { BoardApiError } from '@cavuno/board';
import { isNotFound, isRedirect, redirect } from '@tanstack/react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createCatchAllLoader } from './-catch-all-loader';

import type * as Queries from '../server/queries';

const resolveRedirect = vi.fn<typeof Queries.resolveRedirect>();
const loadCatchAll = createCatchAllLoader(resolveRedirect);

function apiError(status: number) {
  return new BoardApiError({
    status,
    code: 'unknown_error',
    message: 'Refused',
    raw: undefined,
  });
}

function load(path: string) {
  return loadCatchAll({ params: { _splat: path } });
}

beforeEach(() => {
  resolveRedirect.mockReset();
});

describe('catch-all loader', () => {
  it('308s to the configured redirect target', async () => {
    resolveRedirect.mockResolvedValue({
      object: 'redirect_resolution',
      path: '/old-jobs',
      target: '/jobs',
    });

    const result = load('old-jobs');

    await expect(result).rejects.toSatisfy(isRedirect);
    await expect(result).rejects.toMatchObject({
      options: { href: '/jobs', statusCode: 308 },
    });
    expect(resolveRedirect).toHaveBeenCalledWith({
      data: { path: '/old-jobs' },
    });
  });

  it('404s when no redirect matches', async () => {
    resolveRedirect.mockResolvedValue({
      object: 'redirect_resolution',
      path: '/nope',
      target: null,
    });

    await expect(load('nope')).rejects.toSatisfy(isNotFound);
  });

  it('404s when the lookup for a scanner path is refused', async () => {
    resolveRedirect.mockRejectedValue(apiError(403));

    await expect(load('.github/workflows/deploy.yml')).rejects.toSatisfy(
      isNotFound,
    );
  });

  it.each([429, 503])(
    'rejects with the error when the lookup fails with %i',
    async (status) => {
      const failure = apiError(status);
      resolveRedirect.mockRejectedValue(failure);

      await expect(load('old-jobs')).rejects.toBe(failure);
    },
  );

  it('passes the password-wall redirect through', async () => {
    const wall = redirect({ to: '/password' });
    resolveRedirect.mockRejectedValue(wall);

    await expect(load('nope')).rejects.toBe(wall);
  });
});
