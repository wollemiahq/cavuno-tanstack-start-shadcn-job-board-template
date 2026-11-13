/**
 * The Markdown twins of the company pages: the companies index, a company
 * market, a company profile and the company's jobs page.
 *
 * Each builder parses the twin's query with the page route's own search
 * validator and calls the server function its loader calls, with the same
 * input, so `?page=2` and the filters mean what they mean on the page, and
 * board access, the password wall and Board API shedding are unchanged.
 * Like the page: an alias market slug moves to its canonical market, and an
 * unknown slug follows the board's configured redirect, else 404s.
 */
import {
  isNotFound,
  type BoardProfileFormField,
  type PublicCompany,
} from '@cavuno/board';
import {
  companyMarketPath,
  companyPath,
  companySalaryPath,
} from '@cavuno/board/paths';

import { getCompanySearchLabels } from '../../board/company-search-labels';
import {
  toCompanyCardVM,
  toCompanyFieldGroups,
} from '../../board/company-view-model';
import {
  profileLayoutFields,
  type FieldDisplayEntry,
} from '../../board/custom-field-display';
import { companiesResultsShowingLine } from '../../components/board/company-search-page';
import { readBoardContext } from '../../lib/board-context-cache';
import {
  companiesIndexLoaderDeps,
  parseCompaniesIndexSearch,
  parseCompaniesSearch,
  type CompaniesSearch,
} from '../../lib/companies-search';
import {
  customFieldRequestSearch,
  type CustomFieldSearch,
} from '../../lib/custom-field-filters';
import { pageToOffset, totalPages } from '../../lib/pagination';
import { selfUrl } from '../../lib/self-url';
import { m } from '../../paraglide/messages';
import { getLocale } from '../../paraglide/runtime';
import { COMPANIES_PAGE_SIZE } from '../../routes/-companies-index-loader';
import {
  COMPANY_JOBS_PAGE_SIZE,
  parseCompanyJobsSearch,
} from '../../routes/-company-jobs-loader';
import {
  getCompaniesIndexPage,
  getCompaniesMarketPage,
  getCompanyJobsPage,
  getCompanyProfilePage,
} from '../companies-pages';
import { getSimilarCompanies, resolveRedirect } from '../queries';
import {
  bulletList,
  escapeInline,
  htmlToMarkdown,
  link,
  markdownDocument,
  section,
} from './format';
import { fieldValue } from './job-detail';
import {
  canonicalOf,
  jobCardLine,
  listingTwin,
  pageLinks,
  routerSearch,
  type JobCardPage,
  type ListingPageData,
} from './job-listing';
import {
  managedRedirectTwin,
  twinRedirect,
  type ResolveRedirect,
} from './managed-redirect';

import type { JobFormSource } from '../../board/job-form';
import type { MarkdownTwin } from '../../lib/markdown-twin/routes';
import type { MarkdownTwinResult } from './result';
import type { PublicCompanyDetail } from '@cavuno/board';

/** How many jobs the profile previews, as the page does. */
const JOBS_PREVIEW_COUNT = 6;
/** Similar companies the profile loader asks for. */
const SIMILAR_COMPANIES_LIMIT = 6;

type PageMeta = Pick<ListingPageData, 'seo' | 'head'>;
type CompaniesPage = { data: PublicCompany[]; count?: number };
type MarketOption = { canonicalSlug: string; displayName: string };
type CompaniesListing = PageMeta & {
  page: CompaniesPage;
  searchUnavailable: boolean;
  markets: MarketOption[];
};
type CompanyBoard = JobFormSource & {
  forms?: { company?: readonly BoardProfileFormField[] | null } | null;
};

/** The parts of the company server functions' answers the twins read. */
export type CompanyTwinDependencies = {
  getCompaniesIndexPage: (input: {
    data: {
      query?: string;
      customFields?: CustomFieldSearch;
      offset: number;
      limit: number;
    };
  }) => Promise<CompaniesListing>;
  getCompaniesMarketPage: (input: {
    data: {
      marketSlug: string;
      query?: string;
      offset: number;
      limit: number;
    };
  }) => Promise<
    | { kind: 'not_found' }
    | { kind: 'redirect'; to: string }
    | ({ kind: 'ok'; market: { displayName: string } } & CompaniesListing)
  >;
  getCompanyProfilePage: (input: { data: { companySlug: string } }) => Promise<
    PageMeta & {
      company: PublicCompanyDetail;
      jobs: JobCardPage;
      hasSalaries: boolean;
    }
  >;
  getCompanyJobsPage: (input: {
    data: {
      companySlug: string;
      q?: string;
      location?: string;
      offset: number;
      limit: number;
    };
  }) => Promise<
    PageMeta & {
      company: { name: string };
      page: JobCardPage;
      reachableCount?: number;
    }
  >;
  getSimilarCompanies: (input: {
    data: { companySlug: string; limit?: number };
  }) => Promise<{ data: PublicCompany[] }>;
  resolveRedirect: ResolveRedirect;
  readBoardContext: () => Promise<CompanyBoard>;
};

const defaultDependencies: CompanyTwinDependencies = {
  getCompaniesIndexPage,
  getCompaniesMarketPage,
  getCompanyProfilePage,
  getCompanyJobsPage,
  getSimilarCompanies,
  resolveRedirect,
  readBoardContext,
};

/** A company as one line: its name linking its page, the card's teaser
 * and open jobs. */
function companyLine(company: PublicCompany, origin: string): string {
  const vm = toCompanyCardVM(company, getCompanySearchLabels());
  const facts = [vm.descriptionText, vm.openJobsLabel].flatMap((fact) =>
    fact ? [escapeInline(fact)] : [],
  );
  return [link(vm.name, selfUrl(origin, vm.detailHref)), ...facts].join(' · ');
}

/** A companies listing page's twin: heading, range, one line per
 * company, page links and the market directory. */
function companiesListingTwin(options: {
  twin: MarkdownTwin;
  origin: string;
  data: CompaniesListing;
  heading: string;
  search: CompaniesSearch;
  filtered?: boolean;
}): MarkdownTwinResult {
  const { twin, data, search } = options;
  const siteOrigin = data.seo.origin;
  const page = search.page ?? 1;
  const count = data.page.count ?? data.page.data.length;
  const range =
    count > 0
      ? companiesResultsShowingLine(
          {
            from: (page - 1) * COMPANIES_PAGE_SIZE + 1,
            to: Math.min(page * COMPANIES_PAGE_SIZE, count),
            count,
          },
          getLocale(),
        )
      : null;
  const empty = data.searchUnavailable
    ? m.companySearch_unavailableDescription()
    : search.query
      ? m.companiesIndex_noMatchText({ query: search.query })
      : options.filtered
        ? m.companiesIndex_filterNoMatchText()
        : m.companiesIndex_emptyText();
  const body = markdownDocument([
    `# ${escapeInline(options.heading)}`,
    range ? escapeInline(range) : null,
    bulletList(
      data.page.data.map((company) => companyLine(company, siteOrigin)),
    ) ?? escapeInline(empty),
    pageLinks(
      twin,
      options.origin,
      page,
      totalPages(count, COMPANIES_PAGE_SIZE),
      ['selectedCompany'],
    ),
    section(
      m.companiesIndex_browseByMarketHeading(),
      bulletList(
        data.markets.map((market) =>
          link(
            market.displayName,
            selfUrl(siteOrigin, companyMarketPath(market.canonicalSlug)),
          ),
        ),
      ),
    ),
  ]);
  return { type: 'markdown', body, canonical: canonicalOf(data, twin) };
}

export async function buildCompaniesTwin(
  twin: MarkdownTwin,
  origin: string,
  dependencies: CompanyTwinDependencies = defaultDependencies,
): Promise<MarkdownTwinResult> {
  const search = parseCompaniesIndexSearch(routerSearch(twin));
  // The index loader's request, from the same loader deps.
  const deps = companiesIndexLoaderDeps(search);
  const customFields = customFieldRequestSearch(deps);
  const data = await dependencies.getCompaniesIndexPage({
    data: {
      query: deps.query,
      customFields,
      offset: pageToOffset(deps.page ?? 1, COMPANIES_PAGE_SIZE),
      limit: COMPANIES_PAGE_SIZE,
    },
  });
  return companiesListingTwin({
    twin,
    origin,
    data,
    heading: m.companiesIndex_metaTitle(),
    search,
    filtered: customFields !== undefined,
  });
}

export async function buildCompanyMarketTwin(
  twin: MarkdownTwin,
  origin: string,
  dependencies: CompanyTwinDependencies = defaultDependencies,
): Promise<MarkdownTwinResult> {
  const { market = '' } = twin.params;
  const search = parseCompaniesSearch(routerSearch(twin));
  const page = await dependencies.getCompaniesMarketPage({
    data: {
      marketSlug: market,
      query: search.query,
      offset: pageToOffset(search.page ?? 1, COMPANIES_PAGE_SIZE),
      limit: COMPANIES_PAGE_SIZE,
    },
  });
  if (page.kind === 'not_found') {
    return managedRedirectTwin(twin, origin, dependencies.resolveRedirect);
  }
  if (page.kind === 'redirect') {
    return twinRedirect(companyMarketPath(page.to), twin.search);
  }
  return companiesListingTwin({
    twin,
    origin,
    data: page,
    heading: page.market.displayName,
    search,
  });
}

/** A missing company follows the board's configured redirect, as the
 * profile and jobs loaders do. */
async function orRedirect<T>(
  read: () => Promise<T>,
  twin: MarkdownTwin,
  origin: string,
  dependencies: CompanyTwinDependencies,
): Promise<{ page: T } | { miss: MarkdownTwinResult }> {
  try {
    return { page: await read() };
  } catch (error) {
    if (!isNotFound(error)) throw error;
    return {
      miss: await managedRedirectTwin(
        twin,
        origin,
        dependencies.resolveRedirect,
      ),
    };
  }
}

function fieldLines(
  entries: readonly FieldDisplayEntry[],
  origin: string,
): string[] {
  return entries.map(
    (entry) =>
      `**${escapeInline(entry.label)}:** ${fieldValue(entry.value, origin)}`,
  );
}

function fieldBlocks(
  entries: readonly FieldDisplayEntry[],
  origin: string,
): string | null {
  const blocks = entries.map(
    (entry) =>
      `## ${escapeInline(entry.label)}\n\n${fieldValue(entry.value, origin)}`,
  );
  return blocks.length > 0 ? blocks.join('\n\n') : null;
}

export async function buildCompanyTwin(
  twin: MarkdownTwin,
  origin: string,
  dependencies: CompanyTwinDependencies = defaultDependencies,
): Promise<MarkdownTwinResult> {
  const { companySlug = '' } = twin.params;
  const similar = dependencies
    .getSimilarCompanies({
      data: { companySlug, limit: SIMILAR_COMPANIES_LIMIT },
    })
    .then((result) => result.data)
    .catch((): PublicCompany[] => []);
  const read = await orRedirect(
    () => dependencies.getCompanyProfilePage({ data: { companySlug } }),
    twin,
    origin,
    dependencies,
  );
  if ('miss' in read) return read.miss;
  const { company, jobs, hasSalaries, seo } = read.page;
  const board = await dependencies.readBoardContext();
  const locale = getLocale();
  const siteOrigin = seo.origin;
  const fields = toCompanyFieldGroups(
    company,
    profileLayoutFields(board.forms?.company),
    locale,
  );
  const website = company.website
    ? /^https?:\/\//i.test(company.website)
      ? company.website
      : `https://${company.website}`
    : null;
  const openCount = company.publishedJobCount;
  const previewJobs = jobs.data.slice(0, JOBS_PREVIEW_COUNT);
  const jobsHeading =
    openCount === 0
      ? m.companyDetail_openJobsHeading()
      : m.companyDetail_openJobsHeadingCount({
          count: openCount,
          countLabel: openCount.toLocaleString(locale),
        });
  const jobLines = bulletList(
    previewJobs.map((job) => jobCardLine(job, siteOrigin, board)),
  );
  const allJobs =
    openCount > previewJobs.length
      ? link(
          m.companyDetail_viewOpenJobsLabel(),
          selfUrl(siteOrigin, `${companyPath(company.slug)}/jobs`),
        )
      : null;
  const similarLines = bulletList(
    (await similar).map((entry) => companyLine(entry, siteOrigin)),
  );

  const body = markdownDocument([
    `# ${escapeInline(company.name)}`,
    company.summary?.trim() ? escapeInline(company.summary) : null,
    bulletList([
      website && company.website
        ? `**${escapeInline(m.companyDetail_websiteLabel())}:** ${link(company.website, website)}`
        : null,
      company.markets.length > 0
        ? `**${escapeInline(m.employerProfile_marketsLabel())}:** ${company.markets
            .map((market) =>
              link(
                market.displayName,
                selfUrl(siteOrigin, companyMarketPath(market.canonicalSlug)),
              ),
            )
            .join(', ')}`
        : null,
      ...fieldLines(fields.facts, siteOrigin),
    ]),
    company.description ? htmlToMarkdown(company.description) : null,
    fieldBlocks(fields.main, siteOrigin),
    section(
      jobsHeading,
      jobLines
        ? [jobLines, allJobs].filter(Boolean).join('\n\n')
        : escapeInline(m.companyDetail_noOpenJobsText()),
    ),
    hasSalaries
      ? section(
          m.companyDetail_salariesSummaryHeading(),
          link(
            m.companyDetail_viewSalariesLink(),
            selfUrl(siteOrigin, companySalaryPath(company.slug)),
          ),
        )
      : null,
    section(m.companyDetail_similarCompaniesHeading(), similarLines),
  ]);
  return { type: 'markdown', body, canonical: canonicalOf(read.page, twin) };
}

export async function buildCompanyJobsTwin(
  twin: MarkdownTwin,
  origin: string,
  dependencies: CompanyTwinDependencies = defaultDependencies,
): Promise<MarkdownTwinResult> {
  const { companySlug = '' } = twin.params;
  const search = parseCompanyJobsSearch(routerSearch(twin));
  const read = await orRedirect(
    () =>
      dependencies.getCompanyJobsPage({
        data: {
          companySlug,
          q: search.q,
          location: search.location,
          offset: pageToOffset(search.page ?? 1, COMPANY_JOBS_PAGE_SIZE),
          limit: COMPANY_JOBS_PAGE_SIZE,
        },
      }),
    twin,
    origin,
    dependencies,
  );
  if ('miss' in read) return read.miss;
  const { company, page } = read.page;
  const heading = m.companyJobs_heading({ company: company.name });
  return listingTwin({
    twin,
    origin,
    data: { ...read.page, list: page },
    jobForm: await dependencies.readBoardContext(),
    page: search.page ?? 1,
    pageSize: COMPANY_JOBS_PAGE_SIZE,
    heading,
    countedHeading: () => heading,
  });
}
