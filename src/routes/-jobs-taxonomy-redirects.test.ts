import { isRedirect } from '@tanstack/react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createJobsCategoryLoader,
  createJobsLocationCategoryLoader,
  createJobsLocationLoader,
  createJobsLocationSkillLoader,
  createJobsSkillLoader,
} from './-jobs-taxonomy-loaders';

import type * as JobsListingPages from '../server/jobs-listing-pages';

// The programmatic jobs routes 308 an inbound alias slug to its canonical form
// (parity with `companies.markets` and the salaries family). A redirect thrown
// WITHOUT an explicit `statusCode` defaults to a temporary 307, which tells
// crawlers the alias URL is the canonical one — the opposite of the intent.
// These contracts pin the permanent 308 on every taxonomy-alias redirect.

const getJobsCategoryPage =
  vi.fn<typeof JobsListingPages.getJobsCategoryPage>();
const getJobsSkillPage = vi.fn<typeof JobsListingPages.getJobsSkillPage>();
const getJobsLocationPage =
  vi.fn<typeof JobsListingPages.getJobsLocationPage>();
const getJobsLocationCategoryPage =
  vi.fn<typeof JobsListingPages.getJobsLocationCategoryPage>();
const getJobsLocationSkillPage =
  vi.fn<typeof JobsListingPages.getJobsLocationSkillPage>();

const keywordLoader = createJobsCategoryLoader(getJobsCategoryPage);
const skillLoader = createJobsSkillLoader(getJobsSkillPage);
const locationLoader = createJobsLocationLoader(getJobsLocationPage);
const locationKeywordLoader = createJobsLocationCategoryLoader(
  getJobsLocationCategoryPage,
);
const locationSkillLoader = createJobsLocationSkillLoader(
  getJobsLocationSkillPage,
);

/** A page result whose inbound slug is an alias — `to` names the canonical. */
const aliasRedirect = (to: string) => ({ kind: 'redirect' as const, to });

function keywordLoaderInput() {
  return {
    params: { keyword: 'eng' },
    deps: {},
  };
}

function skillLoaderInput() {
  return {
    params: { skill: 'reactjs' },
    deps: {},
  };
}

function locationLoaderInput() {
  return {
    params: { location: 'ldn' },
    deps: {},
  };
}

function locationKeywordLoaderInput() {
  return {
    params: { location: 'ldn', keyword: 'engineering' },
    deps: {},
  };
}

function locationSkillLoaderInput() {
  return {
    params: { location: 'london', skill: 'reactjs' },
    deps: {},
  };
}

async function runKeywordLoader() {
  try {
    return await keywordLoader(keywordLoaderInput());
  } catch (error) {
    return error;
  }
}

async function runSkillLoader() {
  try {
    return await skillLoader(skillLoaderInput());
  } catch (error) {
    return error;
  }
}

async function runLocationLoader() {
  try {
    return await locationLoader(locationLoaderInput());
  } catch (error) {
    return error;
  }
}

async function runLocationKeywordLoader() {
  try {
    return await locationKeywordLoader(locationKeywordLoaderInput());
  } catch (error) {
    return error;
  }
}

async function runLocationSkillLoader() {
  try {
    return await locationSkillLoader(locationSkillLoaderInput());
  } catch (error) {
    return error;
  }
}

beforeEach(() => {
  getJobsCategoryPage.mockReset();
  getJobsSkillPage.mockReset();
  getJobsLocationPage.mockReset();
  getJobsLocationCategoryPage.mockReset();
  getJobsLocationSkillPage.mockReset();
});

describe('programmatic jobs routes — canonical-slug redirects are permanent (308)', () => {
  it('/jobs/$keyword 308s an alias category slug', async () => {
    getJobsCategoryPage.mockResolvedValue(aliasRedirect('engineering'));
    const result = await runKeywordLoader();
    expect(isRedirect(result)).toBe(true);
    if (!isRedirect(result)) throw new Error('Expected a keyword redirect');
    expect(result.options).toMatchObject({
      to: '/jobs/$keyword',
      statusCode: 308,
    });
  });

  it('/jobs/skills/$skill 308s an alias skill slug', async () => {
    getJobsSkillPage.mockResolvedValue(aliasRedirect('react'));
    const result = await runSkillLoader();
    expect(isRedirect(result)).toBe(true);
    if (!isRedirect(result)) throw new Error('Expected a skill redirect');
    expect(result.options).toMatchObject({
      to: '/jobs/skills/$skill',
      statusCode: 308,
    });
  });

  it('/jobs/locations/$location 308s an alias place slug', async () => {
    getJobsLocationPage.mockResolvedValue(aliasRedirect('london'));
    const result = await runLocationLoader();
    expect(isRedirect(result)).toBe(true);
    if (!isRedirect(result)) throw new Error('Expected a location redirect');
    expect(result.options).toMatchObject({
      to: '/jobs/locations/$location',
      statusCode: 308,
    });
  });

  it('/jobs/locations/$location/$keyword 308s when either slug is an alias', async () => {
    getJobsLocationCategoryPage.mockResolvedValue({
      kind: 'redirect' as const,
      locationTo: 'london',
      keywordTo: 'engineering',
    });
    const result = await runLocationKeywordLoader();
    expect(isRedirect(result)).toBe(true);
    if (!isRedirect(result)) {
      throw new Error('Expected a location keyword redirect');
    }
    expect(result.options).toMatchObject({
      to: '/jobs/locations/$location/$keyword',
      statusCode: 308,
    });
  });

  it('/jobs/locations/$location/skills/$skill 308s when either slug is an alias', async () => {
    getJobsLocationSkillPage.mockResolvedValue({
      kind: 'redirect' as const,
      locationTo: 'london',
      skillTo: 'react',
    });
    const result = await runLocationSkillLoader();
    expect(isRedirect(result)).toBe(true);
    if (!isRedirect(result)) {
      throw new Error('Expected a location skill redirect');
    }
    expect(result.options).toMatchObject({
      to: '/jobs/locations/$location/skills/$skill',
      statusCode: 308,
    });
  });
});
