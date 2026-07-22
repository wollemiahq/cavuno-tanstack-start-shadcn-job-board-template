import { isRedirect } from '@tanstack/react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// The programmatic jobs routes 308 an inbound alias slug to its canonical form
// (parity with `companies.markets` and the salaries family). A redirect thrown
// WITHOUT an explicit `statusCode` defaults to a temporary 307, which tells
// crawlers the alias URL is the canonical one — the opposite of the intent.
// These contracts pin the permanent 308 on every taxonomy-alias redirect.

const {
  resolveCategory,
  resolveSkill,
  resolvePlace,
  listJobs,
  searchJobs,
  filterRelatedSearches,
  getSeoBase,
} = vi.hoisted(() => ({
  resolveCategory: vi.fn(),
  resolveSkill: vi.fn(),
  resolvePlace: vi.fn(),
  listJobs: vi.fn(),
  searchJobs: vi.fn(),
  filterRelatedSearches: vi.fn(),
  getSeoBase: vi.fn().mockResolvedValue({}),
}));

vi.mock('../server/queries', () => ({
  resolveCategory,
  resolveSkill,
  resolvePlace,
  listJobs,
  searchJobs,
  filterRelatedSearches,
  getSeoBase,
}));

vi.mock('@/routes/-programmatic-jobs-view', () => ({
  PROGRAMMATIC_JOBS_PAGE_SIZE: 20,
  ProgrammaticJobsView: () => null,
}));

vi.mock('../server/account', () => ({
  saveJob: vi.fn(),
}));

vi.mock('./-use-location-suggestions', () => ({
  useLocationSuggestions: vi.fn(),
}));

import { Route as KeywordRoute } from './jobs.$keyword';
import { Route as LocationKeywordRoute } from './jobs.locations.$location.$keyword';
import { Route as LocationRoute } from './jobs.locations.$location.index';
import { Route as LocationSkillRoute } from './jobs.locations.$location.skills.$skill';
import { Route as SkillRoute } from './jobs.skills.$skill';

// A taxonomy resolution whose inbound slug is an alias — `redirectTo` names the
// canonical slug the loader must 308 to.
const aliasResolution = (redirectTo: string) => ({
  redirectTo,
  displayName: 'Anything',
  canonicalSlug: redirectTo,
  sourceSlug: redirectTo,
});

async function runLoader(loader: unknown, args: unknown): Promise<unknown> {
  if (typeof loader !== 'function') {
    throw new Error('route has no callable loader');
  }
  try {
    return await loader(args);
  } catch (error) {
    return error;
  }
}

beforeEach(() => {
  resolveCategory.mockReset();
  resolveSkill.mockReset();
  resolvePlace.mockReset();
});

describe('programmatic jobs routes — canonical-slug redirects are permanent (308)', () => {
  it('/jobs/$keyword 308s an alias category slug', async () => {
    resolveCategory.mockResolvedValue(aliasResolution('engineering'));
    const result = await runLoader(KeywordRoute.options.loader, {
      params: { keyword: 'eng' },
      deps: {},
    });
    expect(isRedirect(result)).toBe(true);
    expect((result as { options: { statusCode?: number } }).options).toMatchObject(
      { to: '/jobs/$keyword', statusCode: 308 },
    );
  });

  it('/jobs/skills/$skill 308s an alias skill slug', async () => {
    resolveSkill.mockResolvedValue(aliasResolution('react'));
    const result = await runLoader(SkillRoute.options.loader, {
      params: { skill: 'reactjs' },
      deps: {},
    });
    expect(isRedirect(result)).toBe(true);
    expect((result as { options: { statusCode?: number } }).options).toMatchObject(
      { to: '/jobs/skills/$skill', statusCode: 308 },
    );
  });

  it('/jobs/locations/$location 308s an alias place slug', async () => {
    resolvePlace.mockResolvedValue(aliasResolution('london'));
    const result = await runLoader(LocationRoute.options.loader, {
      params: { location: 'ldn' },
      deps: {},
    });
    expect(isRedirect(result)).toBe(true);
    expect((result as { options: { statusCode?: number } }).options).toMatchObject(
      { to: '/jobs/locations/$location', statusCode: 308 },
    );
  });

  it('/jobs/locations/$location/$keyword 308s when either slug is an alias', async () => {
    resolvePlace.mockResolvedValue(aliasResolution('london'));
    resolveCategory.mockResolvedValue({
      redirectTo: null,
      displayName: 'Engineering',
      canonicalSlug: 'engineering',
      sourceSlug: 'engineering',
    });
    const result = await runLoader(LocationKeywordRoute.options.loader, {
      params: { location: 'ldn', keyword: 'engineering' },
      deps: {},
    });
    expect(isRedirect(result)).toBe(true);
    expect((result as { options: { statusCode?: number } }).options).toMatchObject(
      { to: '/jobs/locations/$location/$keyword', statusCode: 308 },
    );
  });

  it('/jobs/locations/$location/skills/$skill 308s when either slug is an alias', async () => {
    resolvePlace.mockResolvedValue({
      redirectTo: null,
      displayName: 'London',
      canonicalSlug: 'london',
      sourceSlug: 'london',
    });
    resolveSkill.mockResolvedValue(aliasResolution('react'));
    const result = await runLoader(LocationSkillRoute.options.loader, {
      params: { location: 'london', skill: 'reactjs' },
      deps: {},
    });
    expect(isRedirect(result)).toBe(true);
    expect((result as { options: { statusCode?: number } }).options).toMatchObject(
      { to: '/jobs/locations/$location/skills/$skill', statusCode: 308 },
    );
  });
});
