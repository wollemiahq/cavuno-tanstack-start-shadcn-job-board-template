import { describe, expect, it } from 'vitest';

import { publicJobFixture } from '../routes/-route-test-fixtures';
import {
  jobAlertDefaultsFromJob,
  jobAlertDefaultsFromSearch,
} from './job-alert-defaults';

import type { PublicJob } from '@cavuno/board';

function job(overrides: Partial<PublicJob> = {}): PublicJob {
  return { ...publicJobFixture('media-lead'), ...overrides };
}

describe('jobAlertDefaultsFromJob', () => {
  it('scopes job functions to category and skill slugs, not display names', () => {
    const defaults = jobAlertDefaultsFromJob(
      job({
        categories: [
          { slug: 'media-and-communication', name: 'Media & Communication' },
        ],
        skills: [{ slug: 'copywriting', name: 'Copywriting' }],
      }),
    );

    expect(defaults.filters.jobFunctions).toEqual([
      'media-and-communication',
      'copywriting',
    ]);
  });

  it('dedupes slugs shared by a category and a skill and caps at eight', () => {
    const skills = Array.from({ length: 10 }, (_, index) => ({
      slug: `skill-${index}`,
      name: `Skill ${index}`,
    }));
    const defaults = jobAlertDefaultsFromJob(
      job({
        categories: [{ slug: 'skill-0', name: 'Skill zero' }],
        skills,
      }),
    );

    expect(defaults.filters.jobFunctions).toEqual(
      Array.from({ length: 8 }, (_, index) => `skill-${index}`),
    );
  });

  it('omits job functions for a job with no categories or skills', () => {
    const defaults = jobAlertDefaultsFromJob(
      job({ categories: [], skills: [] }),
    );

    expect(defaults.filters.jobFunctions).toBeUndefined();
  });
});

describe('jobAlertDefaultsFromSearch', () => {
  it('sends the trimmed keyword for the platform to canonicalize', () => {
    const defaults = jobAlertDefaultsFromSearch({
      keyword: '  Software Engineering ',
    });

    expect(defaults.filters.jobFunctions).toEqual(['Software Engineering']);
    expect(defaults.label).toBe('  Software Engineering ');
  });

  it('omits the job function for a blank keyword', () => {
    const defaults = jobAlertDefaultsFromSearch({ keyword: '   ' });

    expect(defaults.filters.jobFunctions).toBeUndefined();
  });
});
