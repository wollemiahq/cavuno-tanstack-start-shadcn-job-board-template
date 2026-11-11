import { BoardApiError } from '@cavuno/board';
import { isNotFound, isRedirect, redirect } from '@tanstack/react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createCatchAllLoader, requestedPath } from './-catch-all-loader';

import type * as DisabledLocale from '../server/disabled-locale';
import type * as Queries from '../server/queries';

const resolveRedirect = vi.fn<typeof Queries.resolveRedirect>();
const resolveDisabledLocale =
  vi.fn<typeof DisabledLocale.resolveDisabledLocaleRedirect>();
const loadCatchAll = createCatchAllLoader(
  resolveRedirect,
  resolveDisabledLocale,
);

function apiError(status: number) {
  return new BoardApiError({
    status,
    code: 'unknown_error',
    message: 'Refused',
    raw: undefined,
  });
}

function load(path: string, searchStr = '') {
  return loadCatchAll({
    params: { _splat: path },
    location: { href: `/${encodeURI(path)}${searchStr}`, searchStr },
  });
}

function noManagedRedirect() {
  resolveRedirect.mockResolvedValue({
    object: 'redirect_resolution',
    path: '/',
    target: null,
  });
}

beforeEach(() => {
  resolveRedirect.mockReset();
  resolveDisabledLocale.mockReset();
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

  describe('a language the board turned off', () => {
    // No test runtime serves Swedish, so its prefix stands in for a
    // disabled locale.
    it('308s to the board-language page, query kept', async () => {
      noManagedRedirect();
      resolveDisabledLocale.mockResolvedValue({ target: '/jobs/acme' });

      const result = load('sv/jobb/acme', '?page=2');

      await expect(result).rejects.toMatchObject({
        options: { href: '/jobs/acme?page=2', statusCode: 308 },
      });
      expect(resolveRedirect).toHaveBeenCalledWith({
        data: { path: '/sv/jobb/acme' },
      });
      expect(resolveDisabledLocale).toHaveBeenCalledWith({
        data: { path: '/sv/jobb/acme' },
      });
    });

    it('passes the path still percent-encoded', async () => {
      noManagedRedirect();
      resolveDisabledLocale.mockResolvedValue({ target: null });

      await expect(load('sv/jobb/café')).rejects.toSatisfy(isNotFound);
      expect(resolveDisabledLocale).toHaveBeenCalledWith({
        data: { path: '/sv/jobb/caf%C3%A9' },
      });
    });

    it('lets a configured redirect win', async () => {
      resolveRedirect.mockResolvedValue({
        object: 'redirect_resolution',
        path: '/sv/jobb',
        target: '/elsewhere',
      });

      await expect(load('sv/jobb')).rejects.toMatchObject({
        options: { href: '/elsewhere', statusCode: 308 },
      });
      expect(resolveDisabledLocale).not.toHaveBeenCalled();
    });

    it('is not consulted for other unknown paths', async () => {
      noManagedRedirect();

      await expect(load('xx/emplois')).rejects.toSatisfy(isNotFound);
      expect(resolveDisabledLocale).not.toHaveBeenCalled();
    });
  });
});

describe('requestedPath', () => {
  it('keeps the localized path and drops the query and hash', () => {
    expect(requestedPath({ publicHref: '/bedrijven/acme?page=2#top' })).toBe(
      '/bedrijven/acme',
    );
  });

  it('decodes the path like a route param', () => {
    expect(requestedPath({ publicHref: '/bedrijven/caf%C3%A9' })).toBe(
      '/bedrijven/café',
    );
  });
});
