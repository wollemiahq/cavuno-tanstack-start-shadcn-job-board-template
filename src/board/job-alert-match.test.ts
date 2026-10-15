import { describe, expect, it } from 'vitest';

import {
  anchorJobSlugs,
  jobAlertMatch,
  MAX_ANCHOR_JOB_LINKS,
  type JobAlertMatchSource,
} from './job-alert-match';

const anchorJob = { id: 'job-1', slug: 'senior-chef', title: 'Senior chef' };

function alert(overrides: Partial<JobAlertMatchSource>): JobAlertMatchSource {
  return {
    kind: 'filters',
    anchorJob: null,
    filters: { query: null, jobFunctions: [] },
    ...overrides,
  };
}

describe('jobAlertMatch', () => {
  it('names the anchor job of a similar-job alert', () => {
    expect(jobAlertMatch(alert({ kind: 'similar_job', anchorJob }))).toEqual({
      kind: 'similar_job',
      anchorJob: { slug: 'senior-chef', title: 'Senior chef' },
    });
  });

  it('shows a similar-job alert without a captured anchor by its filters', () => {
    expect(jobAlertMatch(alert({ kind: 'similar_job' }))).toEqual({
      kind: 'filters',
    });
  });

  it('reads a search alert’s keywords', () => {
    expect(
      jobAlertMatch(
        alert({ kind: 'search', filters: { query: ' python developer ' } }),
      ),
    ).toEqual({ kind: 'search', query: 'python developer', jobFunctions: [] });
  });

  it('falls back to an older search alert’s job functions', () => {
    expect(
      jobAlertMatch(
        alert({
          kind: 'search',
          filters: { query: null, jobFunctions: ['python-developer'] },
        }),
      ),
    ).toEqual({
      kind: 'search',
      query: null,
      jobFunctions: ['python-developer'],
    });
  });

  it('leaves filter alerts to the stored filter labels', () => {
    expect(
      jobAlertMatch(alert({ filters: { jobFunctions: ['engineering'] } })),
    ).toEqual({ kind: 'filters' });
  });
});

describe('anchorJobSlugs', () => {
  it('collects each similar-job anchor slug once, within the link budget', () => {
    const alerts = [
      alert({ kind: 'similar_job', anchorJob }),
      alert({ kind: 'similar_job', anchorJob }),
      alert({
        kind: 'similar_job',
        anchorJob: { ...anchorJob, id: 'job-2', slug: null },
      }),
      alert({ kind: 'search', filters: { query: 'chef' } }),
      ...Array.from({ length: 12 }, (_, index) =>
        alert({
          kind: 'similar_job',
          anchorJob: { ...anchorJob, slug: `job-${index}` },
        }),
      ),
    ];

    const slugs = anchorJobSlugs(alerts);
    expect(slugs[0]).toBe('senior-chef');
    expect(slugs).toHaveLength(MAX_ANCHOR_JOB_LINKS);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
