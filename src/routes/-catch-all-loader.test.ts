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
    message: 'Forbidden',
    raw: undefined,
  });
}

async function thrownBy(path: string): Promise<unknown> {
  try {
    await loadCatchAll({ params: { _splat: path } });
  } catch (error) {
    return error;
  }
  throw new Error('loader resolved without throwing');
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

    const error = await thrownBy('old-jobs');

    expect(resolveRedirect).toHaveBeenCalledWith({
      data: { path: '/old-jobs' },
    });
    expect(isRedirect(error)).toBe(true);
    expect(error).toMatchObject({
      options: { href: '/jobs', statusCode: 308 },
    });
  });

  it('404s when no redirect matches', async () => {
    resolveRedirect.mockResolvedValue({
      object: 'redirect_resolution',
      path: '/nope',
      target: null,
    });

    expect(isNotFound(await thrownBy('nope'))).toBe(true);
  });

  it('404s when the lookup for a scanner path is refused', async () => {
    resolveRedirect.mockRejectedValue(apiError(403));

    expect(isNotFound(await thrownBy('.github/workflows/deploy.yml'))).toBe(
      true,
    );
  });

  it('rejects with the error when the Board API fails', async () => {
    const outage = apiError(503);
    resolveRedirect.mockRejectedValue(outage);

    expect(await thrownBy('nope')).toBe(outage);
  });

  it('passes the password-wall redirect through', async () => {
    const wall = redirect({ to: '/password' });
    resolveRedirect.mockRejectedValue(wall);

    expect(await thrownBy('nope')).toBe(wall);
  });
});
