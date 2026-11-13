import { isRedirect } from '@tanstack/react-router';
import { describe, expect, it } from 'vitest';

import { Route as CategoryRoute } from './jobs.$keyword';
import { Route as JobsIndexRoute } from './jobs.index';
import { Route as LocationCategoryRoute } from './jobs.locations.$location.$keyword';
import { Route as LocationRoute } from './jobs.locations.$location.index';
import { Route as LocationSkillRoute } from './jobs.locations.$location.skills.$skill';
import { Route as SkillRoute } from './jobs.skills.$skill';

import type { UrlSearchInput } from '@/lib/pagination';

type BeforeLoad = (input: {
  params: Record<string, string>;
  search: UrlSearchInput;
}) => void;

function beforeLoadOf(route: { options: { beforeLoad?: unknown } }) {
  // SAFETY: these routes' beforeLoad reads only `params` and `search`.
  return route.options.beforeLoad as BeforeLoad;
}

/** The redirect a route's beforeLoad throws, or `null` when it lets the URL through. */
function redirectOf(
  route: { options: { beforeLoad?: unknown } },
  params: Record<string, string>,
  search: UrlSearchInput,
) {
  try {
    beforeLoadOf(route)({ params, search });
    return null;
  } catch (error) {
    if (!isRedirect(error)) throw error;
    return error.options;
  }
}

describe('work arrangement redirects', () => {
  it('308s /jobs?remoteOption=remote to the remote page, keeping the query', () => {
    expect(
      redirectOf(JobsIndexRoute, {}, { remoteOption: 'remote', q: 'foo' }),
    ).toMatchObject({
      to: '/jobs/locations/$location',
      params: { location: 'remote' },
      search: { q: 'foo' },
      statusCode: 308,
    });
    expect(redirectOf(JobsIndexRoute, {}, { q: 'foo' })).toBeNull();
  });

  it('keeps /jobs when custom-field filters are active', () => {
    expect(
      redirectOf(
        JobsIndexRoute,
        {},
        { remoteOption: 'remote', 'cf.team': 'platform' },
      ),
    ).toBeNull();
  });

  it('moves a category or skill page’s arrangement into the combination path', () => {
    expect(
      redirectOf(
        CategoryRoute,
        { keyword: 'engineering' },
        { remoteOption: 'hybrid' },
      ),
    ).toMatchObject({
      to: '/jobs/locations/$location/$keyword',
      params: { location: 'hybrid', keyword: 'engineering' },
    });
    expect(
      redirectOf(SkillRoute, { skill: 'python' }, { remoteOption: 'remote' }),
    ).toMatchObject({
      to: '/jobs/locations/$location/skills/$skill',
      params: { location: 'remote', skill: 'python' },
    });
  });

  it('resolves an arrangement page given an arrangement to that page', () => {
    expect(
      redirectOf(
        LocationRoute,
        { location: 'remote' },
        { remoteOption: 'hybrid' },
      ),
    ).toMatchObject({
      params: { location: 'hybrid' },
      search: {},
      statusCode: 308,
    });
    expect(
      redirectOf(
        LocationRoute,
        { location: 'remote' },
        { remoteOption: 'remote' },
      ),
    ).toMatchObject({ params: { location: 'remote' }, search: {} });
    expect(
      redirectOf(LocationRoute, { location: 'remote' }, { q: 'foo' }),
    ).toBeNull();
    expect(
      redirectOf(
        LocationCategoryRoute,
        { location: 'remote', keyword: 'engineering' },
        { remoteOption: 'on_site' },
      ),
    ).toMatchObject({
      params: { location: 'on-site', keyword: 'engineering' },
    });
  });

  it('leaves a real place’s remoteOption in the query string', () => {
    expect(
      redirectOf(
        LocationRoute,
        { location: 'berlin' },
        { remoteOption: 'remote' },
      ),
    ).toBeNull();
    expect(
      redirectOf(
        LocationSkillRoute,
        { location: 'berlin', skill: 'python' },
        { remoteOption: 'hybrid' },
      ),
    ).toBeNull();
  });
});
