import { describe, expect, it } from 'vitest';

import {
  isWorkArrangementSlug,
  withWorkArrangementFilter,
  workArrangementRedirect,
  workArrangementRemoteOption,
  workArrangementSlug,
  workArrangementTarget,
} from './work-arrangement';

describe('work arrangement slugs', () => {
  it('reserves remote, hybrid and on-site in the location slot', () => {
    expect(isWorkArrangementSlug('remote')).toBe(true);
    expect(isWorkArrangementSlug('hybrid')).toBe(true);
    expect(isWorkArrangementSlug('on-site')).toBe(true);
    expect(isWorkArrangementSlug('on_site')).toBe(false);
    expect(isWorkArrangementSlug('berlin')).toBe(false);
    expect(isWorkArrangementSlug('constructor')).toBe(false);
    expect(isWorkArrangementSlug(undefined)).toBe(false);
  });

  it('maps each slug to its remoteOption value and back', () => {
    expect(workArrangementRemoteOption('remote')).toBe('remote');
    expect(workArrangementRemoteOption('hybrid')).toBe('hybrid');
    expect(workArrangementRemoteOption('on-site')).toBe('on_site');
    expect(workArrangementSlug('on_site')).toBe('on-site');
  });

  it('shows the page’s arrangement as the selected filter', () => {
    expect(withWorkArrangementFilter('on-site', { q: 'x' })).toEqual({
      q: 'x',
      remoteOption: 'on_site',
    });
    expect(
      withWorkArrangementFilter('berlin', { remoteOption: 'hybrid' as const }),
    ).toEqual({ remoteOption: 'hybrid' });
    expect(withWorkArrangementFilter(undefined, {})).toEqual({});
  });
});

describe('choosing a work arrangement', () => {
  const other = { q: 'robotics', seniority: ['senior' as const] };

  it('opens the arrangement page from /jobs with the other filters', () => {
    expect(
      workArrangementTarget({}, { ...other, remoteOption: 'remote' }),
    ).toEqual({
      to: '/jobs/locations/$location',
      params: { location: 'remote' },
      search: other,
    });
  });

  it('opens the arrangement combination from a category or skill page', () => {
    expect(
      workArrangementTarget(
        { category: 'engineering' },
        { ...other, remoteOption: 'hybrid' },
      ),
    ).toEqual({
      to: '/jobs/locations/$location/$keyword',
      params: { location: 'hybrid', keyword: 'engineering' },
      search: other,
    });
    expect(
      workArrangementTarget(
        { skill: 'python' },
        { ...other, remoteOption: 'on_site' },
      ),
    ).toEqual({
      to: '/jobs/locations/$location/skills/$skill',
      params: { location: 'on-site', skill: 'python' },
      search: other,
    });
  });

  it('switches between arrangement pages of the same shape', () => {
    expect(
      workArrangementTarget(
        { location: 'remote' },
        { ...other, remoteOption: 'hybrid' },
      ),
    ).toMatchObject({
      to: '/jobs/locations/$location',
      params: { location: 'hybrid' },
    });
    expect(
      workArrangementTarget(
        { location: 'remote', category: 'engineering' },
        { remoteOption: 'on_site' },
      ),
    ).toMatchObject({
      to: '/jobs/locations/$location/$keyword',
      params: { location: 'on-site', keyword: 'engineering' },
    });
  });

  it('keeps the page and drops remoteOption from the URL when other filters change', () => {
    expect(
      workArrangementTarget(
        { location: 'remote', skill: 'python' },
        { ...other, remoteOption: 'remote' },
      ),
    ).toEqual({
      to: '/jobs/locations/$location/skills/$skill',
      params: { location: 'remote', skill: 'python' },
      search: other,
    });
  });

  it('leaves an arrangement page for its listing when cleared or reset', () => {
    expect(workArrangementTarget({ location: 'remote' }, other)).toEqual({
      to: '/jobs',
      search: other,
    });
    expect(
      workArrangementTarget(
        { location: 'hybrid', category: 'engineering' },
        { remoteOption: undefined },
      ),
    ).toEqual({
      to: '/jobs/$keyword',
      params: { keyword: 'engineering' },
      search: {},
    });
    expect(
      workArrangementTarget({ location: 'on-site', skill: 'python' }, {}),
    ).toMatchObject({ to: '/jobs/skills/$skill', params: { skill: 'python' } });
  });

  it('keeps a real place’s arrangement in the query string', () => {
    expect(
      workArrangementTarget({ location: 'berlin' }, { remoteOption: 'remote' }),
    ).toBeNull();
    expect(
      workArrangementTarget(
        { location: 'berlin', category: 'engineering' },
        { remoteOption: 'hybrid' },
      ),
    ).toBeNull();
  });

  it('stays put when no arrangement is chosen off an arrangement page', () => {
    expect(workArrangementTarget({}, other)).toBeNull();
    expect(workArrangementTarget({ category: 'engineering' }, {})).toBeNull();
  });

  it('keeps /jobs while custom-field filters only it can hold are active', () => {
    expect(
      workArrangementTarget(
        {},
        { remoteOption: 'remote', 'cf.team': 'platform' },
      ),
    ).toBeNull();
    expect(
      workArrangementTarget(
        {},
        { remoteOption: 'remote', 'cf.team': undefined },
      ),
    ).toMatchObject({ params: { location: 'remote' } });
  });
});

describe('work arrangement redirects', () => {
  it('sends /jobs?remoteOption=remote to the remote page, keeping the query', () => {
    expect(workArrangementRedirect({}, { remoteOption: 'remote' })).toEqual({
      to: '/jobs/locations/$location',
      params: { location: 'remote' },
      search: {},
    });
    expect(
      workArrangementRedirect({}, { remoteOption: 'remote', q: 'foo' }),
    ).toMatchObject({ search: { q: 'foo' } });
  });

  it('resolves an arrangement page given an arrangement to that page', () => {
    expect(
      workArrangementRedirect(
        { location: 'remote' },
        { remoteOption: 'hybrid' },
      ),
    ).toMatchObject({ params: { location: 'hybrid' }, search: {} });
    expect(
      workArrangementRedirect(
        { location: 'remote' },
        { remoteOption: 'remote' },
      ),
    ).toMatchObject({ params: { location: 'remote' }, search: {} });
  });

  it('never redirects a URL without remoteOption, so a target cannot loop', () => {
    const target = workArrangementRedirect(
      { location: 'remote' },
      { remoteOption: 'hybrid', page: 2 },
    );
    expect(target?.search).not.toHaveProperty('remoteOption');
    expect(
      workArrangementRedirect({ location: 'hybrid' }, target?.search ?? {}),
    ).toBeNull();
    expect(workArrangementRedirect({}, {})).toBeNull();
  });

  it('leaves real place pages alone', () => {
    expect(
      workArrangementRedirect(
        { location: 'berlin' },
        { remoteOption: 'remote' },
      ),
    ).toBeNull();
  });
});
