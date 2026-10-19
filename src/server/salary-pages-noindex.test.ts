import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@tanstack/react-start', () => ({
  createServerFn: () => {
    const builder = {
      validator: () => builder,
      middleware: () => builder,
      handler:
        <TData, TResult>(
          handler: (input: { data: TData; context: object }) => TResult,
        ) =>
        (input: { data: TData }) =>
          handler({ ...input, context: {} }),
    };
    return builder;
  },
}));
vi.mock('../lib/board-access-middleware', () => ({
  boardAccessMiddleware: {},
}));
vi.mock('./board-access', () => ({
  gatedRead: <TResult>(
    _context: Record<string, never>,
    read: (headers: Record<string, string>) => TResult,
  ) => read({}),
}));
vi.mock('../lib/board-context-cache', () => ({
  readBoardContext: async () => ({ name: 'Fixture board', language: 'en' }),
}));
vi.mock('../lib/public-origin', () => ({
  readPublicOrigin: async () => 'https://fixture.example',
}));

const api = vi.hoisted(() => ({
  titleRetrieve: vi.fn(),
  skillRetrieve: vi.fn(),
  titlesList: vi.fn(),
  skillsList: vi.fn(),
  locationsList: vi.fn(),
  companiesList: vi.fn(),
}));
vi.mock('../lib/board', () => ({
  getBoard: () => ({
    salaries: {
      titles: { retrieve: api.titleRetrieve, list: api.titlesList },
      skills: { retrieve: api.skillRetrieve, list: api.skillsList },
      locations: { list: api.locationsList },
      companies: { list: api.companiesList },
    },
  }),
}));

import {
  getSalaryHubPage,
  getSalaryTitlesIndexPage,
  getSkillSalaryPage,
  getTitleSalaryPage,
} from './salary-pages';

const noindexMeta = { name: 'robots', content: 'noindex, follow' };

function overall(jobCount: number) {
  return {
    avgMin: 90_000,
    avgMax: 120_000,
    medianMin: 95_000,
    medianMax: 115_000,
    p25Min: 80_000,
    p75Max: 130_000,
    jobCount,
  };
}

function titleSalary(jobCount: number, extra: { indexable?: boolean } = {}) {
  return {
    object: 'title_salary_detail',
    sourceSlug: 'fixture-title',
    canonicalSlug: 'fixture-title',
    categoryName: 'Fixture title',
    overallSalary: overall(jobCount),
    bySeniority: [],
    topCompanies: [],
    topLocations: [],
    topSkills: [],
    relatedTitles: [],
    currency: 'USD',
    ...extra,
  };
}

function skillSalary(extra: { indexable?: boolean } = {}) {
  return {
    object: 'skill_salary_detail',
    sourceSlug: 'fixture-skill',
    canonicalSlug: 'fixture-skill',
    skillName: 'Fixture skill',
    overallSalary: overall(2),
    bySeniority: [],
    topCompanies: [],
    topLocations: [],
    topTitles: [],
    relatedSkills: [],
    currency: 'USD',
    ...extra,
  };
}

function titleItem(slug: string, extra: { indexable?: boolean } = {}) {
  return {
    object: 'salary_title',
    slug,
    name: slug,
    avgSalaryMin: 1,
    avgSalaryMax: 2,
    p25SalaryMin: 1,
    p75SalaryMax: 2,
    jobCount: 1,
    currency: 'USD',
    ...extra,
  };
}

const list = <T>(data: T[]) => ({ object: 'list', data });

beforeEach(() => {
  api.titleRetrieve.mockReset();
  api.skillRetrieve.mockReset();
  api.titlesList.mockReset().mockResolvedValue(list([]));
  api.skillsList.mockReset().mockResolvedValue(list([]));
  api.locationsList.mockReset().mockResolvedValue(list([]));
  api.companiesList.mockReset().mockResolvedValue(list([]));
});

describe('salary detail page robots meta', () => {
  it('marks a skill page noindex when the API says it is not indexable', async () => {
    api.skillRetrieve.mockResolvedValue(skillSalary({ indexable: false }));
    const page = await getSkillSalaryPage({ data: { slug: 'fixture-skill' } });
    expect(page.head.meta).toContainEqual(noindexMeta);
  });

  it('marks a thin title page (3 jobs) noindex when the API says so', async () => {
    api.titleRetrieve.mockResolvedValue(titleSalary(3, { indexable: false }));
    const page = await getTitleSalaryPage({ data: { slug: 'fixture-title' } });
    expect(page.head.meta).toContainEqual(noindexMeta);
  });

  it('leaves an indexable title page (4 jobs) without a robots meta', async () => {
    api.titleRetrieve.mockResolvedValue(titleSalary(4, { indexable: true }));
    const page = await getTitleSalaryPage({ data: { slug: 'fixture-title' } });
    expect(page.head.meta).not.toContainEqual(
      expect.objectContaining({ name: 'robots' }),
    );
  });

  it('leaves a payload without the field indexable', async () => {
    api.titleRetrieve.mockResolvedValue(titleSalary(3));
    const page = await getTitleSalaryPage({ data: { slug: 'fixture-title' } });
    expect(page.head.meta).not.toContainEqual(
      expect.objectContaining({ name: 'robots' }),
    );
  });
});

describe('salary hub robots meta', () => {
  it('marks a hub noindex when none of its listed pages are indexable', async () => {
    api.titlesList.mockResolvedValue(
      list([
        titleItem('a', { indexable: false }),
        titleItem('b', { indexable: false }),
      ]),
    );
    const page = await getSalaryTitlesIndexPage();
    expect(page.head.meta).toContainEqual(noindexMeta);
  });

  it('keeps a hub indexable when one listed page is', async () => {
    api.titlesList.mockResolvedValue(
      list([titleItem('a', { indexable: false }), titleItem('b')]),
    );
    const page = await getSalaryTitlesIndexPage();
    expect(page.head.meta).not.toContainEqual(
      expect.objectContaining({ name: 'robots' }),
    );
  });

  it('keeps the root hub indexable when any list it loads has an indexable item', async () => {
    api.titlesList.mockResolvedValue(
      list([titleItem('a', { indexable: false })]),
    );
    api.skillsList.mockResolvedValue(
      list([{ object: 'salary_skill', slug: 's', indexable: true }]),
    );
    const page = await getSalaryHubPage();
    expect(page.head.meta).not.toContainEqual(
      expect.objectContaining({ name: 'robots' }),
    );
  });

  it('marks the root hub noindex when no list has an indexable item', async () => {
    api.titlesList.mockResolvedValue(
      list([titleItem('a', { indexable: false })]),
    );
    const page = await getSalaryHubPage();
    expect(page.head.meta).toContainEqual(noindexMeta);
  });
});
