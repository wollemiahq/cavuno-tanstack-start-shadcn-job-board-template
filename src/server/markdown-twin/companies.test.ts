import { BoardApiError } from '@cavuno/board';
import {
  companyMarketPath,
  companyPath,
  jobDetailPath,
} from '@cavuno/board/paths';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { localizePath } from '../../lib/localized-path';
import { resolveMarkdownTwin } from '../../lib/markdown-twin/routes';
import { selfUrl } from '../../lib/self-url';
import { m } from '../../paraglide/messages';
import { getLocale } from '../../paraglide/runtime';
import {
  publicCompanyFixture,
  publicJobCardFixture,
} from '../../routes/-route-test-fixtures';
import {
  buildCompaniesTwin,
  buildCompanyJobsTwin,
  buildCompanyMarketTwin,
  buildCompanyTwin,
  type CompanyTwinDependencies,
} from './companies';
import { escapeInline } from './format';

const ORIGIN = 'https://board.example';
const CANONICAL = 'https://hosted.example/companies/acme';

const dependencies = {
  getCompaniesIndexPage:
    vi.fn<CompanyTwinDependencies['getCompaniesIndexPage']>(),
  getCompaniesMarketPage:
    vi.fn<CompanyTwinDependencies['getCompaniesMarketPage']>(),
  getCompanyProfilePage:
    vi.fn<CompanyTwinDependencies['getCompanyProfilePage']>(),
  getCompanyJobsPage: vi.fn<CompanyTwinDependencies['getCompanyJobsPage']>(),
  getSimilarCompanies: vi.fn<CompanyTwinDependencies['getSimilarCompanies']>(),
  resolveRedirect: vi.fn<CompanyTwinDependencies['resolveRedirect']>(),
  readBoardContext: vi.fn<CompanyTwinDependencies['readBoardContext']>(),
};

const shared = {
  seo: { origin: ORIGIN },
  head: { links: [{ rel: 'canonical', href: CANONICAL }] },
};
const acme = {
  ...publicCompanyFixture('acme', 'Builds *robots*'),
  name: 'Acme',
};
const markets = [{ canonicalSlug: 'robotics', displayName: 'Robotics' }];

function twinFor(path: string) {
  const twin = resolveMarkdownTwin({ method: 'GET', url: `${ORIGIN}${path}` });
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

const notFound = new BoardApiError({
  status: 404,
  code: 'not_found',
  message: 'Company not found',
  raw: undefined,
});

const companiesPath = localizePath('/companies');
const acmePath = localizePath(companyPath('acme'));
const acmeJobsPath = localizePath(`${companyPath('acme')}/jobs`);

beforeEach(() => {
  for (const mock of Object.values(dependencies)) mock.mockReset();
  dependencies.readBoardContext.mockResolvedValue({});
  dependencies.resolveRedirect.mockResolvedValue({ target: null });
  dependencies.getSimilarCompanies.mockResolvedValue({ data: [] });
});

describe('company twins', () => {
  it('lists the companies index with its range, page links and markets', async () => {
    dependencies.getCompaniesIndexPage.mockResolvedValue({
      ...shared,
      page: { data: [acme], count: 30 },
      searchUnavailable: false,
      markets,
    });
    const body = await markdown(
      buildCompaniesTwin(
        twinFor(`${companiesPath}.md?page=2&selectedCompany=acme`),
        ORIGIN,
        dependencies,
      ),
    );

    expect(dependencies.getCompaniesIndexPage).toHaveBeenCalledWith({
      data: expect.objectContaining({ offset: 24, limit: 24 }),
    });
    expect(body.startsWith(`# ${m.companiesIndex_metaTitle()}\n`)).toBe(true);
    expect(body).toContain(
      `- [Acme](${selfUrl(ORIGIN, companyPath('acme'))}) · ${escapeInline('Builds *robots*')}`,
    );
    expect(body).toContain(
      `- [${m.pagination_previousPageLabel()}](${ORIGIN}${companiesPath}.md)`,
    );
    expect(body).toContain(
      `## ${m.companiesIndex_browseByMarketHeading()}\n\n- [Robotics](${selfUrl(ORIGIN, companyMarketPath('robotics'))})`,
    );
  });

  it('moves an alias market to its canonical twin, query kept', async () => {
    dependencies.getCompaniesMarketPage.mockResolvedValue({
      kind: 'redirect',
      to: 'robotics',
    });
    const path = localizePath(companyMarketPath('robots'));
    await expect(
      buildCompanyMarketTwin(
        twinFor(`${path}.md?page=2`),
        ORIGIN,
        dependencies,
      ),
    ).resolves.toEqual({
      type: 'redirect',
      location: `${localizePath(companyMarketPath('robotics'))}.md?page=2`,
    });
  });

  it('reads a company profile: facts, open jobs and similar companies', async () => {
    dependencies.getCompanyProfilePage.mockResolvedValue({
      ...shared,
      company: {
        ...acme,
        publishedJobCount: 8,
        website: 'acme.example',
        description: '<p>We build <strong>robots</strong>.</p>',
      },
      jobs: { data: [publicJobCardFixture('engineer')] },
      hasSalaries: false,
    });
    dependencies.getSimilarCompanies.mockResolvedValue({
      data: [{ ...publicCompanyFixture('beta'), name: 'Beta' }],
    });
    const result = await buildCompanyTwin(
      twinFor(`${acmePath}.md`),
      ORIGIN,
      dependencies,
    );

    expect(result).toMatchObject({ type: 'markdown', canonical: CANONICAL });
    const body = await markdown(Promise.resolve(result));
    expect(body.startsWith('# Acme\n')).toBe(true);
    expect(body).toContain('[acme.example](https://acme.example)');
    expect(body).toContain('We build **robots**.');
    const heading = m.companyDetail_openJobsHeadingCount({
      count: 8,
      countLabel: (8).toLocaleString(getLocale()),
    });
    const job = selfUrl(ORIGIN, jobDetailPath('acme', 'engineer'));
    expect(body).toContain(
      `## ${escapeInline(heading)}\n\n- [engineer](${job})`,
    );
    expect(body).toContain(
      `[${m.companyDetail_viewOpenJobsLabel()}](${selfUrl(ORIGIN, `${companyPath('acme')}/jobs`)})`,
    );
    expect(body).toContain(
      `## ${m.companyDetail_similarCompaniesHeading()}\n\n- [Beta](`,
    );
  });

  it('404s an unknown company after asking for a configured redirect', async () => {
    dependencies.getCompanyProfilePage.mockRejectedValue(notFound);
    await expect(
      buildCompanyTwin(twinFor(`${acmePath}.md`), ORIGIN, dependencies),
    ).resolves.toEqual({ type: 'notFound' });
    expect(dependencies.resolveRedirect).toHaveBeenCalledWith({
      data: { path: acmePath },
    });
  });

  it("lists the company's jobs with the listing renderer", async () => {
    dependencies.getCompanyJobsPage.mockResolvedValue({
      ...shared,
      company: { name: 'Acme' },
      page: { data: [publicJobCardFixture('engineer')], count: 45 },
    });
    const body = await markdown(
      buildCompanyJobsTwin(
        twinFor(`${acmeJobsPath}.md?q=rust`),
        ORIGIN,
        dependencies,
      ),
    );

    expect(dependencies.getCompanyJobsPage).toHaveBeenCalledWith({
      data: expect.objectContaining({ companySlug: 'acme', q: 'rust' }),
    });
    expect(
      body.startsWith(
        `# ${escapeInline(m.companyJobs_heading({ company: 'Acme' }))}\n`,
      ),
    ).toBe(true);
    expect(body).toContain(
      `- [${m.pagination_nextPageLabel()}](${ORIGIN}${acmeJobsPath}.md?q=rust&page=2)`,
    );
  });
});
