import { BoardApiError } from '@cavuno/board';
import {
  companySalaryPath,
  salaryLocationPath,
  salaryTitlePath,
} from '@cavuno/board/paths';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  companyCategorySalaryPath,
  salaryTitleInLocationPath,
  salaryTitleLocationsPath,
} from '../../board/salary-view-model';
import { localizePath } from '../../lib/localized-path';
import { resolveMarkdownTwin } from '../../lib/markdown-twin/routes';
import { selfUrl } from '../../lib/self-url';
import { m } from '../../paraglide/messages';
import { escapeInline } from './format';
import {
  buildSalaryHubTwin,
  buildSalaryLocationsTwin,
  buildSalaryTitleLocationTwin,
  buildSalaryTitleTwin,
  type SalaryTwinDependencies,
} from './salaries';

import { breadcrumbsCopy } from '@/copy-groups/breadcrumbs';

const ORIGIN = 'https://board.example';
const CANONICAL = 'https://hosted.example/salaries/titles/designer';

// Fixtures carry only the fields the twins read.
const dependencies = {
  getSalaryHubPage: vi.fn(),
  getSalaryCompaniesIndexPage: vi.fn(),
  getSalaryTitlesIndexPage: vi.fn(),
  getSalarySkillsIndexPage: vi.fn(),
  getSalaryLocationsIndexPage: vi.fn(),
  getTitleSalaryPage: vi.fn(),
  getTitleLocationsPage: vi.fn(),
  getTitleLocationSalaryPage: vi.fn(),
  getSkillSalaryPage: vi.fn(),
  getSkillLocationsPage: vi.fn(),
  getSkillLocationSalaryPage: vi.fn(),
  getLocationSalaryPage: vi.fn(),
  getLocationTitlesPage: vi.fn(),
  getLocationSkillsPage: vi.fn(),
  getCompanySalariesPage: vi.fn(),
  getCompanyCategorySalaryPage: vi.fn(),
  resolveRedirect: vi.fn(),
} satisfies SalaryTwinDependencies;

const shared = {
  seo: { origin: ORIGIN },
  head: { links: [{ rel: 'canonical', href: CANONICAL }] },
};

const figures = { avgSalaryMin: 90_000, avgSalaryMax: 120_000, jobCount: 4 };

function twinFor(path: string) {
  const twin = resolveMarkdownTwin({
    method: 'GET',
    url: `${ORIGIN}${localizePath(path)}.md`,
  });
  if (!twin) throw new Error(`no twin for ${path}`);
  return twin;
}

async function markdown(result: Promise<{ type: string; body?: string }>) {
  const resolved = await result;
  if (resolved.type !== 'markdown' || !resolved.body) {
    throw new Error(`expected markdown, got ${resolved.type}`);
  }
  return resolved.body;
}

function titleSalary() {
  return {
    canonicalSlug: 'designer',
    categoryName: 'Designer *lead*',
    currency: 'EUR',
    overallSalary: {
      avgMin: 90_000,
      avgMax: 120_000,
      medianMin: 95_000,
      medianMax: 115_000,
      p25Min: 80_000,
      p75Max: 130_000,
      jobCount: 12,
    },
    bySeniority: [],
    topCompanies: [{ companySlug: 'acme', companyName: 'Acme', ...figures }],
    topLocations: [{ placeSlug: 'berlin', placeName: 'Berlin', ...figures }],
    topSkills: [],
    relatedTitles: [],
  };
}

beforeEach(() => {
  for (const mock of Object.values(dependencies)) mock.mockReset();
  dependencies.resolveRedirect.mockResolvedValue({ target: null });
});

describe('salary twins', () => {
  it('reads a title page: figures, rails with their links and the FAQ', async () => {
    dependencies.getTitleSalaryPage.mockResolvedValue({
      ...shared,
      salary: titleSalary(),
      faqs: [{ q: 'How much?', a: 'About 100k.' }],
    });
    const result = await buildSalaryTitleTwin(
      twinFor(salaryTitlePath('designer')),
      ORIGIN,
      dependencies,
    );

    expect(dependencies.getTitleSalaryPage).toHaveBeenCalledWith({
      data: { slug: 'designer' },
    });
    expect(result).toMatchObject({ type: 'markdown', canonical: CANONICAL });
    const body = await markdown(Promise.resolve(result));
    expect(
      body.startsWith(
        `# ${escapeInline(m.salaryDetail_titleHeading({ title: 'Designer *lead*' }))}\n`,
      ),
    ).toBe(true);
    expect(body).toContain(
      `## ${m.salaryDetail_topCompanies()}\n\n- [Acme](${selfUrl(ORIGIN, companyCategorySalaryPath('acme', 'designer'))}) · `,
    );
    expect(body).toContain(
      `- [Berlin](${selfUrl(ORIGIN, salaryTitleInLocationPath('designer', 'berlin'))})`,
    );
    expect(body).toContain(
      `[${m.salaryDetail_seeAllLocationsLabel()}](${selfUrl(ORIGIN, salaryTitleLocationsPath('designer'))})`,
    );
    expect(body).toContain('**How much?**\n\nAbout 100k.');
    // Empty rails are left out, as on the page.
    expect(body).not.toContain(m.salaryDetail_relatedTitles());
  });

  it('moves a source slug to the canonical twin', async () => {
    dependencies.getTitleSalaryPage.mockResolvedValue({
      ...shared,
      salary: titleSalary(),
      faqs: [],
    });
    await expect(
      buildSalaryTitleTwin(
        twinFor(salaryTitlePath('ontwerper')),
        ORIGIN,
        dependencies,
      ),
    ).resolves.toEqual({
      type: 'redirect',
      location: `${localizePath(salaryTitlePath('designer'))}.md`,
    });
  });

  it('moves a title-in-place page when either slug is not canonical', async () => {
    dependencies.getTitleLocationSalaryPage.mockResolvedValue({
      ...shared,
      salary: {
        categoryCanonicalSlug: 'designer',
        locationCanonicalSlug: 'berlin',
      },
    });
    await expect(
      buildSalaryTitleLocationTwin(
        twinFor(salaryTitleInLocationPath('designer', 'berlijn')),
        ORIGIN,
        dependencies,
      ),
    ).resolves.toEqual({
      type: 'redirect',
      location: `${localizePath(salaryTitleInLocationPath('designer', 'berlin'))}.md`,
    });
  });

  it('follows a configured redirect for a missing page, else 404s', async () => {
    dependencies.getTitleSalaryPage.mockRejectedValue(
      new BoardApiError({
        status: 404,
        code: 'not_found',
        message: 'Not found',
        raw: undefined,
      }),
    );
    const twin = twinFor(salaryTitlePath('gone'));
    await expect(
      buildSalaryTitleTwin(twin, ORIGIN, dependencies),
    ).resolves.toEqual({ type: 'notFound' });

    dependencies.resolveRedirect.mockResolvedValue({
      target: salaryTitlePath('designer'),
    });
    await expect(
      buildSalaryTitleTwin(twin, ORIGIN, dependencies),
    ).resolves.toEqual({
      type: 'redirect',
      location: `${salaryTitlePath('designer')}.md`,
    });
  });

  it('lists only the indexable cards on the hub, with see-all links', async () => {
    dependencies.getSalaryHubPage.mockResolvedValue({
      ...shared,
      companies: [
        {
          companySlug: 'acme',
          companyName: 'Acme',
          currency: 'EUR',
          ...figures,
        },
        {
          companySlug: 'thin',
          companyName: 'Thin',
          currency: 'EUR',
          indexable: false,
          ...figures,
        },
      ],
      titles: [],
      skills: [],
      locations: [],
    });
    const body = await markdown(
      buildSalaryHubTwin(twinFor('/salaries'), ORIGIN, dependencies),
    );

    const crumbs = breadcrumbsCopy();
    expect(body.startsWith(`# ${escapeInline(crumbs.salaries)}\n`)).toBe(true);
    expect(body).toContain(
      `- [Acme](${selfUrl(ORIGIN, companySalaryPath('acme'))})`,
    );
    expect(body).not.toContain('[Thin]');
    expect(body).toContain(`[${m.salaryHub_seeAllCompaniesLabel()}](`);
    expect(body).not.toContain(m.salaryHub_seeAllTitlesLabel());
  });

  it('nests the places directory as the page does, or shows its empty state', async () => {
    const place = (placeSlug: string, parentSlug: string | null) => ({
      placeSlug,
      placeName: placeSlug,
      parentSlug,
      ...figures,
    });
    dependencies.getSalaryLocationsIndexPage.mockResolvedValue({
      ...shared,
      locations: [place('germany', null), place('berlin', 'germany')],
    });
    const body = await markdown(
      buildSalaryLocationsTwin(
        twinFor('/salaries/locations'),
        ORIGIN,
        dependencies,
      ),
    );
    expect(body).toContain(
      `- [germany](${selfUrl(ORIGIN, salaryLocationPath('germany'))})`,
    );
    expect(body).toContain(
      `\n  - [berlin](${selfUrl(ORIGIN, salaryLocationPath('berlin'))})`,
    );

    dependencies.getSalaryLocationsIndexPage.mockResolvedValue({
      ...shared,
      locations: [],
    });
    expect(
      await markdown(
        buildSalaryLocationsTwin(
          twinFor('/salaries/locations'),
          ORIGIN,
          dependencies,
        ),
      ),
    ).toContain(escapeInline(m.salaryHub_emptyDescription()));
  });
});
