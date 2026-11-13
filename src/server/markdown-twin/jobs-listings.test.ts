import {
  jobDetailPath,
  jobsCategoryPath,
  jobsLocationPath,
} from '@cavuno/board/paths';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { localizePath } from '../../lib/localized-path';
import { resolveMarkdownTwin } from '../../lib/markdown-twin/routes';
import { selfUrl } from '../../lib/self-url';
import { m } from '../../paraglide/messages';
import { getLocale } from '../../paraglide/runtime';
import { publicJobCardFixture } from '../../routes/-route-test-fixtures';
import { escapeInline } from './format';
import {
  buildJobsCategoryTwin,
  buildJobsLocationTwin,
  buildJobsLocationsTwin,
  buildJobsTwin,
  type ListingTwinDependencies,
} from './jobs-listings';

import type { PublicPlace } from '@cavuno/board';

const ORIGIN = 'https://board.example';
const CANONICAL = 'https://hosted.example/jobs';

const dependencies = {
  getJobsIndexPage: vi.fn<ListingTwinDependencies['getJobsIndexPage']>(),
  getJobsCategoryPage: vi.fn<ListingTwinDependencies['getJobsCategoryPage']>(),
  getJobsSkillPage: vi.fn<ListingTwinDependencies['getJobsSkillPage']>(),
  getJobsLocationsIndexPage:
    vi.fn<ListingTwinDependencies['getJobsLocationsIndexPage']>(),
  getJobsLocationPage: vi.fn<ListingTwinDependencies['getJobsLocationPage']>(),
  getJobsLocationCategoryPage:
    vi.fn<ListingTwinDependencies['getJobsLocationCategoryPage']>(),
  getJobsLocationSkillPage:
    vi.fn<ListingTwinDependencies['getJobsLocationSkillPage']>(),
  resolveRedirect: vi.fn<ListingTwinDependencies['resolveRedirect']>(),
  readBoardContext: vi.fn<ListingTwinDependencies['readBoardContext']>(),
};

const shared = {
  seo: { origin: ORIGIN },
  head: { links: [{ rel: 'canonical', href: CANONICAL }] },
};
const hostile = { ...publicJobCardFixture('engineer'), title: 'Eng [x](y)' };
const list = { data: [hostile], count: 45 };

function twinFor(path: string) {
  const twin = resolveMarkdownTwin({ method: 'GET', url: `${ORIGIN}${path}` });
  if (!twin) throw new Error(`no twin for ${path}`);
  return twin;
}

function countLabel(count: number) {
  return { count, countLabel: count.toLocaleString(getLocale()) };
}

async function markdown(result: Promise<{ type: string; body?: string }>) {
  const resolved = await result;
  if (resolved.type !== 'markdown' || !resolved.body) {
    throw new Error(`expected markdown, got ${resolved.type}`);
  }
  return resolved.body;
}

const jobsPath = localizePath('/jobs');
const categoryPath = localizePath(jobsCategoryPath('engineering'));

beforeEach(() => {
  for (const mock of Object.values(dependencies)) mock.mockReset();
  dependencies.readBoardContext.mockResolvedValue({});
  dependencies.resolveRedirect.mockResolvedValue({ target: null });
});

describe('job listing twins', () => {
  it('lists a /jobs page with its count, job links and page links', async () => {
    dependencies.getJobsIndexPage.mockResolvedValue({ ...shared, page: list });
    const body = await markdown(
      buildJobsTwin(twinFor(`${jobsPath}.md?page=2`), ORIGIN, dependencies),
    );

    expect(dependencies.getJobsIndexPage).toHaveBeenCalledWith({
      data: expect.objectContaining({ offset: 20, limit: 20 }),
    });
    expect(body.startsWith(`# ${m.count_jobs(countLabel(45))}\n`)).toBe(true);
    const jobUrl = selfUrl(ORIGIN, jobDetailPath('acme', 'engineer'));
    expect(body).toContain(`- [${escapeInline('Eng [x](y)')}](${jobUrl})`);
    expect(body).toContain(
      `- [${m.pagination_previousPageLabel()}](${ORIGIN}${jobsPath}.md)`,
    );
    expect(body).toContain(
      `- [${m.pagination_nextPageLabel()}](${ORIGIN}${jobsPath}.md?page=3)`,
    );
  });

  it('moves a work arrangement filter to its page, as the page does', async () => {
    await expect(
      buildJobsTwin(
        twinFor(`${jobsPath}.md?remoteOption=remote&page=2`),
        ORIGIN,
        dependencies,
      ),
    ).resolves.toEqual({
      type: 'redirect',
      location: `${localizePath(jobsLocationPath('remote'))}.md?page=2`,
    });
    expect(dependencies.getJobsIndexPage).not.toHaveBeenCalled();
  });

  it('heads a category page with its counted heading and related searches', async () => {
    dependencies.getJobsCategoryPage.mockResolvedValue({
      ...shared,
      kind: 'ok',
      category: { displayName: 'Engineering' },
      list,
      relatedSearches: [
        {
          type: 'skill',
          slug: 'python',
          canonicalSlug: 'python',
          term: 'Python',
          displayName: 'Python',
          count: 3,
        },
      ],
    });
    const result = await buildJobsCategoryTwin(
      twinFor(`${categoryPath}.md`),
      ORIGIN,
      dependencies,
    );

    expect(dependencies.getJobsCategoryPage).toHaveBeenCalledWith({
      data: expect.objectContaining({ categorySlug: 'engineering', offset: 0 }),
    });
    expect(result).toMatchObject({ type: 'markdown', canonical: CANONICAL });
    const body = await markdown(Promise.resolve(result));
    const heading = m.categoryPage_jobsCountHeading({
      ...countLabel(45),
      category: 'Engineering',
    });
    expect(body.startsWith(`# ${escapeInline(heading)}\n`)).toBe(true);
    expect(body).toContain(`## ${m.jobCard_relatedSearchesTitle()}\n\n- [`);
    expect(body).not.toContain(m.pagination_previousPageLabel());
  });

  it('moves an alias slug to its canonical twin, query kept', async () => {
    dependencies.getJobsCategoryPage.mockResolvedValue({
      kind: 'redirect',
      to: 'software',
    });
    await expect(
      buildJobsCategoryTwin(
        twinFor(`${categoryPath}.md?page=2`),
        ORIGIN,
        dependencies,
      ),
    ).resolves.toEqual({
      type: 'redirect',
      location: `${localizePath(jobsCategoryPath('software'))}.md?page=2`,
    });
  });

  it('404s an unknown slug without a configured redirect', async () => {
    dependencies.getJobsCategoryPage.mockResolvedValue({ kind: 'not_found' });
    await expect(
      buildJobsCategoryTwin(
        twinFor(`${categoryPath}.md`),
        ORIGIN,
        dependencies,
      ),
    ).resolves.toEqual({ type: 'notFound' });
    expect(dependencies.resolveRedirect).toHaveBeenCalledWith({
      data: { path: categoryPath },
    });
  });

  it('reads a work arrangement page as the arrangement, with its distance', async () => {
    dependencies.getJobsLocationPage.mockResolvedValue({
      ...shared,
      kind: 'ok',
      place: { displayName: 'Remote' },
      list: { data: [], count: 0 },
    });
    const path = localizePath(jobsLocationPath('remote'));
    const body = await markdown(
      buildJobsLocationTwin(
        twinFor(`${path}.md?within=50`),
        ORIGIN,
        dependencies,
      ),
    );

    expect(dependencies.getJobsLocationPage).toHaveBeenCalledWith({
      data: expect.objectContaining({ locationSlug: 'remote', within: 50 }),
    });
    const heading = m.workArrangementPage_remoteJobsCountHeading(countLabel(0));
    expect(body).toBe(
      `# ${escapeInline(heading)}\n\n${escapeInline(
        m.jobSearch_noMatchingResultsHeading(),
      )}\n`,
    );
  });

  it('nests the locations directory by parent', async () => {
    const place = (
      id: string,
      parentId: string | null,
      jobCount: number,
    ): PublicPlace => ({
      object: 'place',
      id,
      parentId,
      slug: id,
      canonicalSlug: id,
      name: id,
      displayName: id.toUpperCase(),
      placeType: 'city',
      countryCode: null,
      regionCode: null,
      jobCount,
    });
    const places = [place('de', null, 3), place('berlin', 'de', 2)];
    dependencies.getJobsLocationsIndexPage.mockResolvedValue({
      ...shared,
      places: { data: places },
    });
    const body = await markdown(
      buildJobsLocationsTwin(
        twinFor(`${localizePath('/jobs/locations')}.md`),
        ORIGIN,
        dependencies,
      ),
    );

    const berlin = selfUrl(ORIGIN, jobsLocationPath('berlin'));
    expect(body).toContain(
      `\n  - [BERLIN](${berlin}) · ${m.count_jobs(countLabel(2))}`,
    );
  });
});
