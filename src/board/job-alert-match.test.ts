import { describe, expect, it, vi } from 'vitest';

import { m } from '../paraglide/messages';
import {
  jobAlertMatch,
  resolveAlertFilterNames,
  resolveAnchorJobPaths,
  searchKeywordsText,
  taxonomySlug,
  type DescribableJobAlert,
  type JobAlertMatchSource,
  type JobAlertSearchMatch,
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

function describable(
  filters: DescribableJobAlert['filters'],
  kind: DescribableJobAlert['kind'] = 'filters',
): DescribableJobAlert {
  return { kind, anchorJob: null, label: null, filters };
}

function searchMatch(source: JobAlertMatchSource): JobAlertSearchMatch {
  const match = jobAlertMatch(source);
  if (match.kind === 'similar_job') throw new Error('not a search match');
  return match;
}

describe('jobAlertMatch', () => {
  it('keeps a similar-job alert similar-job, with or without its anchor job', () => {
    expect(jobAlertMatch(alert({ kind: 'similar_job', anchorJob }))).toEqual({
      kind: 'similar_job',
      anchorJob,
    });
    expect(jobAlertMatch(alert({ kind: 'similar_job' }))).toEqual({
      kind: 'similar_job',
      anchorJob: null,
    });
  });

  it('reads a search alert’s keywords and the roles next to them', () => {
    expect(
      jobAlertMatch(
        alert({
          kind: 'search',
          filters: { query: ' react ', jobFunctions: ['engineering'] },
        }),
      ),
    ).toEqual({ kind: 'search', keywords: 'react', roles: ['engineering'] });
  });

  it('reads an older search alert’s keyword job function as its keywords', () => {
    expect(
      jobAlertMatch(
        alert({
          kind: 'search',
          filters: { query: null, jobFunctions: ['python-developer'] },
        }),
      ),
    ).toEqual({ kind: 'search', keywords: 'python developer', roles: [] });
    // The board stores a captured keyword as the query and its slug.
    expect(
      jobAlertMatch(
        alert({
          kind: 'search',
          filters: {
            query: 'C++ Developer',
            jobFunctions: ['c-plus-plus-developer'],
          },
        }),
      ),
    ).toEqual({ kind: 'search', keywords: 'C++ Developer', roles: [] });
  });

  it('keeps a filter alert’s job functions as roles', () => {
    expect(
      jobAlertMatch(alert({ filters: { jobFunctions: ['engineering'] } })),
    ).toEqual({ kind: 'filters', keywords: null, roles: ['engineering'] });
  });
});

describe('searchKeywordsText', () => {
  it('quotes the keywords before any roles, and is null without either', () => {
    expect(
      searchKeywordsText(
        searchMatch(
          alert({
            kind: 'search',
            filters: { query: 'react', jobFunctions: ['engineering'] },
          }),
        ),
      ),
    ).toBe(`${m.jobAlertMatch_quotedQuery({ query: 'react' })}, engineering`);
    expect(searchKeywordsText(searchMatch(alert({})))).toBeNull();
  });
});

describe('taxonomySlug', () => {
  it('slugs text the way the board slugs job functions', () => {
    expect(taxonomySlug('  Python Developer ')).toBe('python-developer');
    expect(taxonomySlug('C#')).toBe('c-sharp');
    expect(taxonomySlug('Science & Technology')).toBe('science-and-technology');
    expect(taxonomySlug('Crème brûlée')).toBe('creme-brulee');
  });
});

describe('resolveAnchorJobPaths', () => {
  it('asks for the similar-job anchors only, and shows titles unlinked if that fails', async () => {
    const getAnchorJobPaths = vi.fn().mockResolvedValue({
      'senior-chef': '/companies/acme/jobs/senior-chef',
    });
    const alerts = [
      alert({ kind: 'similar_job', anchorJob }),
      alert({ kind: 'similar_job', anchorJob: { ...anchorJob, slug: null } }),
      alert({ kind: 'similar_job' }),
      alert({ kind: 'search', filters: { query: 'chef' } }),
    ];

    await expect(
      resolveAnchorJobPaths(alerts, getAnchorJobPaths),
    ).resolves.toEqual({ 'senior-chef': '/companies/acme/jobs/senior-chef' });
    expect(getAnchorJobPaths).toHaveBeenCalledExactlyOnceWith({
      data: { jobSlugs: ['senior-chef'] },
    });

    getAnchorJobPaths.mockRejectedValue(new Error('jobs unavailable'));
    await expect(
      resolveAnchorJobPaths(alerts, getAnchorJobPaths),
    ).resolves.toEqual({});
  });

  it('makes no request without a similar-job anchor', async () => {
    const getAnchorJobPaths = vi.fn();
    await expect(
      resolveAnchorJobPaths([alert({ kind: 'search' })], getAnchorJobPaths),
    ).resolves.toEqual({});
    expect(getAnchorJobPaths).not.toHaveBeenCalled();
  });
});

describe('resolveAlertFilterNames', () => {
  it('asks once for each category and place, and falls back to none if that fails', async () => {
    const names = {
      categories: { chef: 'Chef', baker: 'Baker' },
      places: { 'place-leeds': 'Leeds' },
    };
    const getAlertFilterNames = vi.fn().mockResolvedValue(names);
    const alerts: DescribableJobAlert[] = [
      describable({ jobFunctions: ['chef'] }),
      describable({ jobFunctions: ['chef', 'baker'] }),
      describable(
        { query: 'pilot', placeIds: ['place-leeds', 'place-leeds'] },
        'search',
      ),
      { ...describable({}, 'similar_job'), anchorJob },
    ];

    await expect(
      resolveAlertFilterNames(alerts, getAlertFilterNames),
    ).resolves.toEqual(names);
    expect(getAlertFilterNames).toHaveBeenCalledExactlyOnceWith({
      data: { categorySlugs: ['chef', 'baker'], placeIds: ['place-leeds'] },
    });

    getAlertFilterNames.mockRejectedValue(new Error('taxonomy unavailable'));
    await expect(
      resolveAlertFilterNames(alerts, getAlertFilterNames),
    ).resolves.toEqual({ categories: {}, places: {} });
  });

  it('makes no request without a category or place', async () => {
    const getAlertFilterNames = vi.fn();
    await expect(
      resolveAlertFilterNames(
        [describable({ query: 'pilot' }, 'search')],
        getAlertFilterNames,
      ),
    ).resolves.toEqual({ categories: {}, places: {} });
    expect(getAlertFilterNames).not.toHaveBeenCalled();
  });
});
