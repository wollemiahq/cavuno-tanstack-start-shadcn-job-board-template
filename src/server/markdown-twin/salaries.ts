import { isNotFound } from '@cavuno/board';
import {
  BOARD_PATHS,
  companySalaryPath,
  salaryLocationPath,
  salarySkillPath,
  salaryTitlePath,
} from '@cavuno/board/paths';

/**
 * The Markdown twins of the salary pages: the hub, its four directories,
 * the title, skill and location pages with their cross-axis pages, and a
 * company's salary pages.
 *
 * Each builder calls the server function its page's loader calls, with the
 * same input, so board access, the password wall and Board API shedding are
 * unchanged, and lists the same cards in the same order with the same
 * figures and links. Like the page: a source slug moves to its canonical
 * slug, and a missing page follows the board's configured redirect, else
 * 404s. A page the API marks not indexable still has a twin, as it still
 * has a page; twins are noindex anyway.
 */
import {
  companyCategorySalaryPath,
  formatSalaryRange,
  indexableSalaryItems,
  salaryLocationSkillsPath,
  salaryLocationTitlesPath,
  salarySkillInLocationPath,
  salarySkillLinkPath,
  salarySkillLocationsPath,
  salaryTitleInLocationPath,
  salaryTitleLocationsPath,
  toOverallSalaryVM,
  toSalaryFaqVM,
  toSalaryRailVM,
  toSeniorityTableVM,
  type OverallSalary,
  type RailItem,
  type SeniorityRow,
} from '../../board/salary-view-model';
import { entityCount } from '../../lib/entity-count';
import { selfUrl } from '../../lib/self-url';
import { chromeEntity } from '../../lib/site-chrome';
import { m } from '../../paraglide/messages';
import { getLocale } from '../../paraglide/runtime';
import {
  getCompanyCategorySalaryPage,
  getCompanySalariesPage,
} from '../companies-pages';
import { resolveRedirect } from '../queries';
import {
  getLocationSalaryPage,
  getLocationSkillsPage,
  getLocationTitlesPage,
  getSalaryCompaniesIndexPage,
  getSalaryHubPage,
  getSalaryLocationsIndexPage,
  getSalarySkillsIndexPage,
  getSalaryTitlesIndexPage,
  getSkillLocationSalaryPage,
  getSkillLocationsPage,
  getSkillSalaryPage,
  getTitleLocationSalaryPage,
  getTitleLocationsPage,
  getTitleSalaryPage,
} from '../salary-pages';
import {
  bulletList,
  escapeInline,
  link,
  markdownDocument,
  section,
  table,
} from './format';
import { canonicalOf } from './job-listing';
import {
  managedRedirectTwin,
  twinRedirect,
  type ResolveRedirect,
} from './managed-redirect';

import type { MarkdownTwin } from '../../lib/markdown-twin/routes';
import type { MarkdownTwinResult } from './result';
import { breadcrumbsCopy } from '@/copy-groups/breadcrumbs';

/** Cards per directory on the hub, as the hub page shows. */
const HUB_PREVIEW = 9;

type PageOf<F extends (...args: never[]) => Promise<object>> = Awaited<
  ReturnType<F>
>;
type SlugInput = { data: { slug: string } };
type CrossInput = { data: { slug: string; locationSlug: string } };

/** The salary server functions the twins call, as their loaders do. */
export type SalaryTwinDependencies = {
  getSalaryHubPage: () => Promise<PageOf<typeof getSalaryHubPage>>;
  getSalaryCompaniesIndexPage: () => Promise<
    PageOf<typeof getSalaryCompaniesIndexPage>
  >;
  getSalaryTitlesIndexPage: () => Promise<
    PageOf<typeof getSalaryTitlesIndexPage>
  >;
  getSalarySkillsIndexPage: () => Promise<
    PageOf<typeof getSalarySkillsIndexPage>
  >;
  getSalaryLocationsIndexPage: () => Promise<
    PageOf<typeof getSalaryLocationsIndexPage>
  >;
  getTitleSalaryPage: (
    input: SlugInput,
  ) => Promise<PageOf<typeof getTitleSalaryPage>>;
  getTitleLocationsPage: (
    input: SlugInput,
  ) => Promise<PageOf<typeof getTitleLocationsPage>>;
  getTitleLocationSalaryPage: (
    input: CrossInput,
  ) => Promise<PageOf<typeof getTitleLocationSalaryPage>>;
  getSkillSalaryPage: (
    input: SlugInput,
  ) => Promise<PageOf<typeof getSkillSalaryPage>>;
  getSkillLocationsPage: (
    input: SlugInput,
  ) => Promise<PageOf<typeof getSkillLocationsPage>>;
  getSkillLocationSalaryPage: (
    input: CrossInput,
  ) => Promise<PageOf<typeof getSkillLocationSalaryPage>>;
  getLocationSalaryPage: (
    input: SlugInput,
  ) => Promise<PageOf<typeof getLocationSalaryPage>>;
  getLocationTitlesPage: (
    input: SlugInput,
  ) => Promise<PageOf<typeof getLocationTitlesPage>>;
  getLocationSkillsPage: (
    input: SlugInput,
  ) => Promise<PageOf<typeof getLocationSkillsPage>>;
  getCompanySalariesPage: (input: {
    data: { companySlug: string };
  }) => Promise<PageOf<typeof getCompanySalariesPage>>;
  getCompanyCategorySalaryPage: (input: {
    data: { companySlug: string; categorySlug: string };
  }) => Promise<PageOf<typeof getCompanyCategorySalaryPage>>;
  resolveRedirect: ResolveRedirect;
};

const defaultDependencies: SalaryTwinDependencies = {
  getSalaryHubPage: () => getSalaryHubPage(),
  getSalaryCompaniesIndexPage: () => getSalaryCompaniesIndexPage(),
  getSalaryTitlesIndexPage: () => getSalaryTitlesIndexPage(),
  getSalarySkillsIndexPage: () => getSalarySkillsIndexPage(),
  getSalaryLocationsIndexPage: () => getSalaryLocationsIndexPage(),
  getTitleSalaryPage,
  getTitleLocationsPage,
  getTitleLocationSalaryPage,
  getSkillSalaryPage,
  getSkillLocationsPage,
  getSkillLocationSalaryPage,
  getLocationSalaryPage,
  getLocationTitlesPage,
  getLocationSkillsPage,
  getCompanySalariesPage,
  getCompanyCategorySalaryPage,
  resolveRedirect,
};

/** A salary figure row as a card: name, link, range and job count. */
type SalaryRow = {
  avgSalaryMin: number;
  avgSalaryMax: number;
  jobCount: number;
};

function railItem(
  name: string,
  href: string,
  row: SalaryRow,
  currency: string | null | undefined,
): RailItem {
  return {
    name,
    href,
    range:
      formatSalaryRange(
        getLocale(),
        row.avgSalaryMin,
        row.avgSalaryMax,
        currency,
      ) ?? '',
    jobCount: row.jobCount,
  };
}

/** Salary cards as list lines: the name linking its page, then the range
 * and job count the card shows. */
function railList(items: readonly RailItem[], origin: string): string | null {
  const vm = toSalaryRailVM('', [...items], getLocale());
  return bulletList(
    vm.items.map((item) =>
      [
        link(item.name, selfUrl(origin, item.href)),
        ...[item.range, item.jobCountLabel].flatMap((fact) =>
          fact ? [escapeInline(fact)] : [],
        ),
      ].join(' · '),
    ),
  );
}

/** A titled rail; like the page, an empty one is left out. */
function railSection(
  heading: string,
  items: readonly RailItem[],
  origin: string,
  seeAll?: { label: string; path: string },
): string | null {
  const list = railList(items, origin);
  if (!list) return null;
  const more = seeAll ? link(seeAll.label, selfUrl(origin, seeAll.path)) : null;
  return section(heading, [list, more].filter(Boolean).join('\n\n'));
}

function overallBlock(
  overall: OverallSalary | null,
  currency: string | null | undefined,
): string | null {
  if (!overall) return null;
  const vm = toOverallSalaryVM(overall, getLocale(), currency);
  return bulletList([
    vm.headlineValue
      ? `**${escapeInline(vm.headlineLabel)}:** ${escapeInline(
          `${vm.headlineValue} ${vm.perYearSuffix}`,
        )}`
      : null,
    ...vm.stats.map(
      (stat) => `**${escapeInline(stat.label)}:** ${escapeInline(stat.value)}`,
    ),
  ]);
}

function senioritySection(
  heading: string,
  rows: SeniorityRow[],
  currency: string | null | undefined,
): string | null {
  const vm = toSeniorityTableVM(rows, getLocale(), currency);
  return section(
    heading,
    table(
      [vm.headers.level, vm.headers.avg, vm.headers.baseline, vm.headers.diff],
      vm.rows.map((row) => [
        row.level,
        row.avg,
        row.baseline,
        row.diff?.text ?? '—',
      ]),
    ),
  );
}

/** Seniority rows of a cross-axis page, which carry no board baseline. */
function withoutBaseline(
  rows: ReadonlyArray<
    Omit<SeniorityRow, 'boardAvgMin' | 'boardAvgMax' | 'diffPercent'>
  >,
): SeniorityRow[] {
  return rows.map((row) => ({
    ...row,
    boardAvgMin: null,
    boardAvgMax: null,
    diffPercent: null,
  }));
}

function faqSection(
  faqs: ReadonlyArray<{ q: string; a: string }>,
): string | null {
  const vm = toSalaryFaqVM([...faqs], getLocale());
  const items = vm.items.map(
    (item) => `**${escapeInline(item.q)}**\n\n${escapeInline(item.a)}`,
  );
  return section(vm.heading, items.length > 0 ? items.join('\n\n') : null);
}

/** A salary page's twin: heading, intro, then its blocks, or the empty
 * state the page shows when it has none. */
function salaryTwin(options: {
  twin: MarkdownTwin;
  page: Parameters<typeof canonicalOf>[0];
  heading: string;
  description?: string;
  blocks: ReadonlyArray<string | null>;
  empty: string;
}): MarkdownTwinResult {
  const blocks = options.blocks.filter(Boolean);
  const body = markdownDocument([
    `# ${escapeInline(options.heading)}`,
    options.description ? escapeInline(options.description) : null,
    ...(blocks.length > 0 ? blocks : [escapeInline(options.empty)]),
  ]);
  return {
    type: 'markdown',
    body,
    canonical: canonicalOf(options.page, options.twin),
  };
}

/** The page read, or what its loader answers when the API has no such
 * page: the board's configured redirect, else 404. */
async function readOrRedirect<T>(
  read: () => Promise<T>,
  twin: MarkdownTwin,
  origin: string,
  resolve: ResolveRedirect,
): Promise<{ page: T } | { miss: MarkdownTwinResult }> {
  try {
    return { page: await read() };
  } catch (error) {
    if (!isNotFound(error)) throw error;
    return { miss: await managedRedirectTwin(twin, origin, resolve) };
  }
}

// ── Hub and directories ─────────────────────────────────────────────────────

export async function buildSalaryHubTwin(
  twin: MarkdownTwin,
  _origin: string,
  dependencies: SalaryTwinDependencies = defaultDependencies,
): Promise<MarkdownTwinResult> {
  const page = await dependencies.getSalaryHubPage();
  const origin = page.seo.origin;
  const crumbs = breadcrumbsCopy();
  const companies = indexableSalaryItems(page.companies)
    .slice(0, HUB_PREVIEW)
    .map((x) =>
      railItem(x.companyName, companySalaryPath(x.companySlug), x, x.currency),
    );
  const titles = indexableSalaryItems(page.titles)
    .slice(0, HUB_PREVIEW)
    .map((x) => railItem(x.name, salaryTitlePath(x.slug), x, x.currency));
  const skills = page.skills
    .slice(0, HUB_PREVIEW)
    .map((x) => railItem(x.name, salarySkillLinkPath(x.slug), x, x.currency));
  // Location index items carry no currency; the page never invents one.
  const locations = indexableSalaryItems(page.locations)
    .slice(0, HUB_PREVIEW)
    .map((x) =>
      railItem(x.placeName, salaryLocationPath(x.placeSlug), x, null),
    );
  return salaryTwin({
    twin,
    page,
    heading: crumbs.salaries,
    description: m.salaryHub_subheading(),
    blocks: [
      railSection(crumbs.companies, companies, origin, {
        label: m.salaryHub_seeAllCompaniesLabel(),
        path: BOARD_PATHS.salaryCompanies,
      }),
      railSection(crumbs.titles, titles, origin, {
        label: m.salaryHub_seeAllTitlesLabel(),
        path: BOARD_PATHS.salaryTitles,
      }),
      railSection(crumbs.skills, skills, origin, {
        label: m.salaryHub_seeAllSkillsLabel(),
        path: BOARD_PATHS.salarySkills,
      }),
      railSection(crumbs.locations, locations, origin, {
        label: m.salaryHub_seeAllLocationsLabel(),
        path: BOARD_PATHS.salaryLocations,
      }),
    ],
    empty: m.salaryHub_emptyDescription(),
  });
}

export async function buildSalaryCompaniesTwin(
  twin: MarkdownTwin,
  _origin: string,
  dependencies: SalaryTwinDependencies = defaultDependencies,
): Promise<MarkdownTwinResult> {
  const page = await dependencies.getSalaryCompaniesIndexPage();
  const items = page.companies.map((x) =>
    railItem(x.companyName, companySalaryPath(x.companySlug), x, x.currency),
  );
  return salaryTwin({
    twin,
    page,
    heading: m.salaryHub_companiesHeading(),
    blocks: [railList(items, page.seo.origin)],
    empty: m.salaryHub_emptyDescription(),
  });
}

export async function buildSalaryTitlesTwin(
  twin: MarkdownTwin,
  _origin: string,
  dependencies: SalaryTwinDependencies = defaultDependencies,
): Promise<MarkdownTwinResult> {
  const page = await dependencies.getSalaryTitlesIndexPage();
  const items = indexableSalaryItems(page.titles).map((x) =>
    railItem(x.name, salaryTitlePath(x.slug), x, x.currency),
  );
  return salaryTwin({
    twin,
    page,
    heading: m.salaryHub_titlesHeading(),
    blocks: [railList(items, page.seo.origin)],
    empty: m.salaryHub_emptyDescription(),
  });
}

export async function buildSalarySkillsTwin(
  twin: MarkdownTwin,
  _origin: string,
  dependencies: SalaryTwinDependencies = defaultDependencies,
): Promise<MarkdownTwinResult> {
  const page = await dependencies.getSalarySkillsIndexPage();
  const items = page.skills.map((x) =>
    railItem(x.name, salarySkillPath(x.slug), x, x.currency),
  );
  return salaryTwin({
    twin,
    page,
    heading: m.salaryHub_skillsHeading(),
    blocks: [railList(items, page.seo.origin)],
    empty: m.salaryHub_emptyDescription(),
  });
}

type LocationNode = PageOf<
  typeof getSalaryLocationsIndexPage
>['locations'][number];

/** The place tree (country, region, city) as a nested list, as the page
 * shows it. */
function locationTree(
  byParent: ReadonlyMap<string | null, LocationNode[]>,
  parentSlug: string | null,
  origin: string,
  depth = 0,
  seen = new Set<string>(),
): string[] {
  const entity = chromeEntity();
  const locale = getLocale();
  return (byParent.get(parentSlug) ?? []).flatMap((node) => {
    if (seen.has(node.placeSlug)) return [];
    seen.add(node.placeSlug);
    const facts = [
      formatSalaryRange(locale, node.avgSalaryMin, node.avgSalaryMax, null) ??
        '',
      entityCount(node.jobCount, locale, m.count_jobs, {
        singular: entity.jobSingular,
        plural: entity.jobPlural,
      }),
    ].flatMap((fact) => (fact ? [escapeInline(fact)] : []));
    const line = `${'  '.repeat(depth)}- ${[
      link(node.placeName, selfUrl(origin, salaryLocationPath(node.placeSlug))),
      ...facts,
    ].join(' · ')}`;
    return [
      line,
      ...locationTree(byParent, node.placeSlug, origin, depth + 1, seen),
    ];
  });
}

export async function buildSalaryLocationsTwin(
  twin: MarkdownTwin,
  _origin: string,
  dependencies: SalaryTwinDependencies = defaultDependencies,
): Promise<MarkdownTwinResult> {
  const page = await dependencies.getSalaryLocationsIndexPage();
  const byParent = new Map<string | null, LocationNode[]>();
  for (const node of page.locations) {
    byParent.set(node.parentSlug, [
      ...(byParent.get(node.parentSlug) ?? []),
      node,
    ]);
  }
  const lines = locationTree(byParent, null, page.seo.origin);
  return salaryTwin({
    twin,
    page,
    heading: m.salaryHub_locationsHeading(),
    blocks: [lines.length > 0 ? lines.join('\n') : null],
    empty: m.salaryHub_emptyDescription(),
  });
}

// ── Titles ──────────────────────────────────────────────────────────────────

export async function buildSalaryTitleTwin(
  twin: MarkdownTwin,
  origin: string,
  dependencies: SalaryTwinDependencies = defaultDependencies,
): Promise<MarkdownTwinResult> {
  const { slug = '' } = twin.params;
  const read = await readOrRedirect(
    () => dependencies.getTitleSalaryPage({ data: { slug } }),
    twin,
    origin,
    dependencies.resolveRedirect,
  );
  if ('miss' in read) return read.miss;
  const { salary, faqs, seo } = read.page;
  if (salary.canonicalSlug !== slug) {
    return twinRedirect(salaryTitlePath(salary.canonicalSlug));
  }
  const site = seo.origin;
  const currency = salary.currency;
  return salaryTwin({
    twin,
    page: read.page,
    heading: m.salaryDetail_titleHeading({ title: salary.categoryName }),
    blocks: [
      overallBlock(salary.overallSalary, currency),
      senioritySection(
        m.salaryDetail_seniorityHeading(),
        salary.bySeniority,
        currency,
      ),
      railSection(
        m.salaryDetail_topCompanies(),
        salary.topCompanies.map((x) =>
          railItem(
            x.companyName,
            companyCategorySalaryPath(x.companySlug, salary.canonicalSlug),
            x,
            currency,
          ),
        ),
        site,
      ),
      railSection(
        m.salaryDetail_topLocations(),
        salary.topLocations.map((x) =>
          railItem(
            x.placeName,
            salaryTitleInLocationPath(salary.canonicalSlug, x.placeSlug),
            x,
            currency,
          ),
        ),
        site,
        {
          label: m.salaryDetail_seeAllLocationsLabel(),
          path: salaryTitleLocationsPath(salary.canonicalSlug),
        },
      ),
      railSection(
        m.salaryDetail_topSkills(),
        salary.topSkills.map((x) =>
          railItem(x.skillName, salarySkillLinkPath(x.skillSlug), x, currency),
        ),
        site,
      ),
      railSection(
        m.salaryDetail_relatedTitles(),
        salary.relatedTitles.map((x) =>
          railItem(
            x.categoryName,
            salaryTitlePath(x.categorySlug),
            x,
            currency,
          ),
        ),
        site,
      ),
      faqSection(faqs),
    ],
    empty: m.salaryDetail_notFoundTitle(),
  });
}

export async function buildSalaryTitleLocationsTwin(
  twin: MarkdownTwin,
  origin: string,
  dependencies: SalaryTwinDependencies = defaultDependencies,
): Promise<MarkdownTwinResult> {
  const { slug = '' } = twin.params;
  const read = await readOrRedirect(
    () => dependencies.getTitleLocationsPage({ data: { slug } }),
    twin,
    origin,
    dependencies.resolveRedirect,
  );
  if ('miss' in read) return read.miss;
  const { data, seo } = read.page;
  if (data.canonicalSlug !== slug) {
    return twinRedirect(salaryTitleLocationsPath(data.canonicalSlug));
  }
  return salaryTwin({
    twin,
    page: read.page,
    heading: m.salaryDetail_titleLocationsHeading({ title: data.categoryName }),
    blocks: [
      railSection(
        m.salaryDetail_locationsLabel(),
        data.locations.map((x) =>
          railItem(
            x.placeName,
            salaryTitleInLocationPath(data.canonicalSlug, x.placeSlug),
            x,
            data.currency,
          ),
        ),
        seo.origin,
      ),
    ],
    empty: m.salaryHub_emptyDescription(),
  });
}

export async function buildSalaryTitleLocationTwin(
  twin: MarkdownTwin,
  origin: string,
  dependencies: SalaryTwinDependencies = defaultDependencies,
): Promise<MarkdownTwinResult> {
  const { slug = '', locationSlug = '' } = twin.params;
  const read = await readOrRedirect(
    () =>
      dependencies.getTitleLocationSalaryPage({ data: { slug, locationSlug } }),
    twin,
    origin,
    dependencies.resolveRedirect,
  );
  if ('miss' in read) return read.miss;
  const { salary, seo } = read.page;
  const cat = salary.categoryCanonicalSlug;
  const place = salary.locationCanonicalSlug;
  // Both axes move to their canonical slug in the same redirect.
  if (cat !== slug || place !== locationSlug) {
    return twinRedirect(salaryTitleInLocationPath(cat, place));
  }
  const site = seo.origin;
  const currency = salary.currency;
  const placeItems = (rows: typeof salary.childLocations) =>
    rows.map((x) =>
      railItem(
        x.placeName,
        salaryTitleInLocationPath(cat, x.placeSlug),
        x,
        currency,
      ),
    );
  const overall = salary.overallSalary;
  return salaryTwin({
    twin,
    page: read.page,
    heading: m.salaryDetail_titleInPlaceHeading({
      title: salary.categoryName,
      place: salary.placeName,
    }),
    blocks: [
      overallBlock(
        overall
          ? {
              avgMin: overall.avgMin,
              avgMax: overall.avgMax,
              jobCount: overall.jobCount,
              p25Min: overall.p25Min ?? undefined,
              p75Max: overall.p75Max ?? undefined,
            }
          : null,
        currency,
      ),
      senioritySection(
        m.salaryDetail_seniorityHeading(),
        withoutBaseline(salary.bySeniority),
        currency,
      ),
      railSection(
        m.salaryDetail_citiesLabel(),
        placeItems(salary.childLocations),
        site,
      ),
      railSection(
        m.salaryDetail_otherLocations(),
        placeItems(salary.otherLocations),
        site,
      ),
      railSection(
        m.salaryDetail_topSkills(),
        salary.topSkills.map((x) =>
          railItem(x.skillName, salarySkillLinkPath(x.skillSlug), x, currency),
        ),
        site,
      ),
      railSection(
        m.salaryDetail_relatedTitles(),
        salary.topTitles.map((x) =>
          railItem(
            x.categoryName,
            salaryTitleInLocationPath(x.categorySlug, place),
            x,
            currency,
          ),
        ),
        site,
      ),
    ],
    empty: m.salaryHub_emptyDescription(),
  });
}

// ── Skills ──────────────────────────────────────────────────────────────────

export async function buildSalarySkillTwin(
  twin: MarkdownTwin,
  origin: string,
  dependencies: SalaryTwinDependencies = defaultDependencies,
): Promise<MarkdownTwinResult> {
  const { slug = '' } = twin.params;
  const read = await readOrRedirect(
    () => dependencies.getSkillSalaryPage({ data: { slug } }),
    twin,
    origin,
    dependencies.resolveRedirect,
  );
  if ('miss' in read) return read.miss;
  const { salary, faqs, seo } = read.page;
  if (salary.canonicalSlug !== slug) {
    return twinRedirect(salarySkillPath(salary.canonicalSlug));
  }
  const site = seo.origin;
  const currency = salary.currency;
  return salaryTwin({
    twin,
    page: read.page,
    heading: m.salaryDetail_skillHeading({ skill: salary.skillName }),
    blocks: [
      overallBlock(salary.overallSalary, currency),
      senioritySection(
        m.salaryDetail_seniorityHeading(),
        salary.bySeniority,
        currency,
      ),
      railSection(
        m.salaryDetail_topCompanies(),
        salary.topCompanies.map((x) =>
          railItem(
            x.companyName,
            companySalaryPath(x.companySlug),
            x,
            currency,
          ),
        ),
        site,
      ),
      railSection(
        m.salaryDetail_topLocations(),
        salary.topLocations.map((x) =>
          railItem(
            x.placeName,
            salarySkillInLocationPath(salary.canonicalSlug, x.placeSlug),
            x,
            currency,
          ),
        ),
        site,
        {
          label: m.salaryDetail_seeAllLocationsLabel(),
          path: salarySkillLocationsPath(salary.canonicalSlug),
        },
      ),
      railSection(
        m.salaryDetail_topTitles(),
        salary.topTitles.map((x) =>
          railItem(
            x.categoryName,
            salaryTitlePath(x.categorySlug),
            x,
            currency,
          ),
        ),
        site,
      ),
      railSection(
        m.salaryDetail_relatedSkills(),
        salary.relatedSkills.map((x) =>
          railItem(x.skillName, salarySkillPath(x.skillSlug), x, currency),
        ),
        site,
      ),
      faqSection(faqs),
    ],
    empty: m.salaryHub_emptyDescription(),
  });
}

export async function buildSalarySkillLocationsTwin(
  twin: MarkdownTwin,
  origin: string,
  dependencies: SalaryTwinDependencies = defaultDependencies,
): Promise<MarkdownTwinResult> {
  const { slug = '' } = twin.params;
  const read = await readOrRedirect(
    () => dependencies.getSkillLocationsPage({ data: { slug } }),
    twin,
    origin,
    dependencies.resolveRedirect,
  );
  if ('miss' in read) return read.miss;
  const { data, seo } = read.page;
  if (data.canonicalSlug !== slug) {
    return twinRedirect(salarySkillLocationsPath(data.canonicalSlug));
  }
  return salaryTwin({
    twin,
    page: read.page,
    heading: m.salaryDetail_skillLocationsHeading({ skill: data.skillName }),
    blocks: [
      railSection(
        m.salaryDetail_locationsLabel(),
        data.locations.map((x) =>
          railItem(
            x.placeName,
            salarySkillInLocationPath(data.canonicalSlug, x.placeSlug),
            x,
            data.currency,
          ),
        ),
        seo.origin,
      ),
    ],
    empty: m.salaryHub_emptyDescription(),
  });
}

export async function buildSalarySkillLocationTwin(
  twin: MarkdownTwin,
  origin: string,
  dependencies: SalaryTwinDependencies = defaultDependencies,
): Promise<MarkdownTwinResult> {
  const { slug = '', locationSlug = '' } = twin.params;
  const read = await readOrRedirect(
    () =>
      dependencies.getSkillLocationSalaryPage({ data: { slug, locationSlug } }),
    twin,
    origin,
    dependencies.resolveRedirect,
  );
  if ('miss' in read) return read.miss;
  const { salary, seo } = read.page;
  const skill = salary.skillCanonicalSlug;
  const place = salary.locationCanonicalSlug;
  if (skill !== slug || place !== locationSlug) {
    return twinRedirect(salarySkillInLocationPath(skill, place));
  }
  const site = seo.origin;
  const currency = salary.currency;
  const placeItems = (rows: typeof salary.childLocations) =>
    rows.map((x) =>
      railItem(
        x.placeName,
        salarySkillInLocationPath(skill, x.placeSlug),
        x,
        currency,
      ),
    );
  const overall = salary.overallSalary;
  return salaryTwin({
    twin,
    page: read.page,
    heading: m.salaryDetail_skillInPlaceHeading({
      skill: salary.skillName,
      place: salary.placeName,
    }),
    blocks: [
      overallBlock(
        overall
          ? {
              avgMin: overall.avgMin,
              avgMax: overall.avgMax,
              jobCount: overall.jobCount,
              p25Min: overall.p25Min ?? undefined,
              p75Max: overall.p75Max ?? undefined,
            }
          : null,
        currency,
      ),
      senioritySection(
        m.salaryDetail_seniorityHeading(),
        withoutBaseline(salary.bySeniority),
        currency,
      ),
      railSection(
        m.salaryDetail_citiesLabel(),
        placeItems(salary.childLocations),
        site,
      ),
      railSection(
        m.salaryDetail_otherLocations(),
        placeItems(salary.otherLocations),
        site,
      ),
      railSection(
        m.salaryDetail_topSkills(),
        salary.topSkills.map((x) =>
          railItem(
            x.skillName,
            salarySkillInLocationPath(x.skillSlug, place),
            x,
            currency,
          ),
        ),
        site,
      ),
      railSection(
        m.salaryDetail_relatedTitles(),
        salary.topTitles.map((x) =>
          railItem(
            x.categoryName,
            salaryTitleInLocationPath(x.categorySlug, place),
            x,
            currency,
          ),
        ),
        site,
      ),
    ],
    empty: m.salaryHub_emptyDescription(),
  });
}

// ── Locations ───────────────────────────────────────────────────────────────

export async function buildSalaryLocationTwin(
  twin: MarkdownTwin,
  origin: string,
  dependencies: SalaryTwinDependencies = defaultDependencies,
): Promise<MarkdownTwinResult> {
  const { slug = '' } = twin.params;
  const read = await readOrRedirect(
    () => dependencies.getLocationSalaryPage({ data: { slug } }),
    twin,
    origin,
    dependencies.resolveRedirect,
  );
  if ('miss' in read) return read.miss;
  const { salary, faqs, seo } = read.page;
  if (salary.canonicalSlug !== slug) {
    return twinRedirect(salaryLocationPath(salary.canonicalSlug));
  }
  const site = seo.origin;
  const currency = salary.currency;
  const cityItems = (rows: typeof salary.childLocations) =>
    rows.map((x) =>
      // Child cities carry their own currency on the wire.
      railItem(
        x.placeName,
        salaryLocationPath(x.placeSlug),
        x,
        x.currency ?? currency,
      ),
    );
  return salaryTwin({
    twin,
    page: read.page,
    heading: m.salaryDetail_placeHeading({ place: salary.placeName }),
    blocks: [
      overallBlock(salary.overallSalary, currency),
      railSection(
        m.salaryDetail_citiesInPlaceLabel({ place: salary.placeName }),
        cityItems(salary.childLocations),
        site,
      ),
      ...salary.childLocationsByRegion.map((group) =>
        railSection(group.regionName, cityItems(group.cities), site),
      ),
      railSection(
        m.salaryDetail_otherLocations(),
        cityItems(salary.siblingLocations),
        site,
      ),
      // The API's top titles and skills for a place are board-wide figures,
      // so they link the board-wide pages, as the page's cards do.
      railSection(
        m.salaryDetail_topTitles(),
        salary.topCategories.map((x) =>
          railItem(
            x.categoryName,
            salaryTitlePath(x.categorySlug),
            x,
            currency,
          ),
        ),
        site,
      ),
      railSection(
        m.salaryDetail_topSkills(),
        salary.topSkills.map((x) =>
          railItem(x.skillName, salarySkillLinkPath(x.skillSlug), x, currency),
        ),
        site,
      ),
      faqSection(faqs),
    ],
    empty: m.salaryHub_emptyDescription(),
  });
}

export async function buildSalaryLocationTitlesTwin(
  twin: MarkdownTwin,
  origin: string,
  dependencies: SalaryTwinDependencies = defaultDependencies,
): Promise<MarkdownTwinResult> {
  const { slug = '' } = twin.params;
  const read = await readOrRedirect(
    () => dependencies.getLocationTitlesPage({ data: { slug } }),
    twin,
    origin,
    dependencies.resolveRedirect,
  );
  if ('miss' in read) return read.miss;
  const { data, seo } = read.page;
  if (data.canonicalSlug !== slug) {
    return twinRedirect(salaryLocationTitlesPath(data.canonicalSlug));
  }
  return salaryTwin({
    twin,
    page: read.page,
    heading: m.salaryDetail_titlesInPlaceHeading({ place: data.placeName }),
    blocks: [
      railSection(
        m.salaryDetail_jobTitlesLabel(),
        data.titles.map((x) =>
          railItem(
            x.name,
            salaryTitleInLocationPath(x.slug, data.canonicalSlug),
            x,
            null,
          ),
        ),
        seo.origin,
      ),
    ],
    empty: m.salaryHub_emptyDescription(),
  });
}

export async function buildSalaryLocationSkillsTwin(
  twin: MarkdownTwin,
  origin: string,
  dependencies: SalaryTwinDependencies = defaultDependencies,
): Promise<MarkdownTwinResult> {
  const { slug = '' } = twin.params;
  const read = await readOrRedirect(
    () => dependencies.getLocationSkillsPage({ data: { slug } }),
    twin,
    origin,
    dependencies.resolveRedirect,
  );
  if ('miss' in read) return read.miss;
  const { data, seo } = read.page;
  if (data.canonicalSlug !== slug) {
    return twinRedirect(salaryLocationSkillsPath(data.canonicalSlug));
  }
  return salaryTwin({
    twin,
    page: read.page,
    heading: m.salaryDetail_skillsInPlaceHeading({ place: data.placeName }),
    blocks: [
      railSection(
        m.salaryDetail_skillsLabel(),
        data.skills.map((x) =>
          railItem(
            x.name,
            salarySkillInLocationPath(x.slug, data.canonicalSlug),
            x,
            null,
          ),
        ),
        seo.origin,
      ),
    ],
    empty: m.salaryHub_emptyDescription(),
  });
}

// ── Company salaries ────────────────────────────────────────────────────────

export async function buildCompanySalariesTwin(
  twin: MarkdownTwin,
  origin: string,
  dependencies: SalaryTwinDependencies = defaultDependencies,
): Promise<MarkdownTwinResult> {
  const { companySlug = '' } = twin.params;
  const read = await readOrRedirect(
    () => dependencies.getCompanySalariesPage({ data: { companySlug } }),
    twin,
    origin,
    dependencies.resolveRedirect,
  );
  if ('miss' in read) return read.miss;
  const { salary, faqs, seo } = read.page;
  const site = seo.origin;
  const currency = salary.currency;
  const overall = salary.overallSalary;
  return salaryTwin({
    twin,
    page: read.page,
    heading: m.companySalaries_heading({ company: salary.companyName }),
    blocks: [
      overallBlock(
        overall
          ? {
              avgMin: overall.avgMin,
              avgMax: overall.avgMax,
              jobCount: overall.jobCount,
            }
          : null,
        currency,
      ),
      senioritySection(
        m.companySalaries_seniorityHeading(),
        salary.bySeniority,
        currency,
      ),
      railSection(
        m.companySalaries_salariesByRoleLabel(),
        salary.byCategory.map((x) =>
          railItem(
            x.categoryName,
            companyCategorySalaryPath(salary.companySlug, x.categorySlug),
            x,
            currency,
          ),
        ),
        site,
      ),
      railSection(
        m.companySalaries_topLocationsLabel(),
        salary.topLocations.map((x) =>
          railItem(
            x.locationName,
            salaryLocationPath(x.placeSlug),
            x,
            currency,
          ),
        ),
        site,
      ),
      railSection(
        m.companySalaries_otherCompaniesLabel(),
        salary.competitors.map((x) =>
          railItem(
            x.companyName,
            companySalaryPath(x.companySlug),
            x,
            currency,
          ),
        ),
        site,
      ),
      // The page always links back to the salary company directory.
      link(
        m.salaryHub_seeAllCompaniesLabel(),
        selfUrl(site, BOARD_PATHS.salaryCompanies),
      ),
      faqSection(faqs),
    ],
    empty: m.salaryHub_emptyDescription(),
  });
}

export async function buildCompanyCategorySalaryTwin(
  twin: MarkdownTwin,
  origin: string,
  dependencies: SalaryTwinDependencies = defaultDependencies,
): Promise<MarkdownTwinResult> {
  const { companySlug = '', categorySlug = '' } = twin.params;
  const read = await readOrRedirect(
    () =>
      dependencies.getCompanyCategorySalaryPage({
        data: { companySlug, categorySlug },
      }),
    twin,
    origin,
    dependencies.resolveRedirect,
  );
  if ('miss' in read) return read.miss;
  const { salary, faqs, seo } = read.page;
  // The category slug moves to its canonical form; the company slug is
  // never localized, so it stays as asked.
  if (salary.categoryCanonicalSlug !== categorySlug) {
    return twinRedirect(
      companyCategorySalaryPath(companySlug, salary.categoryCanonicalSlug),
    );
  }
  const currency = salary.currency;
  const overall = salary.overallSalary;
  return salaryTwin({
    twin,
    page: read.page,
    heading: m.companySalaries_categoryHeading({
      category: salary.categoryName,
      company: salary.companyName,
    }),
    blocks: [
      overallBlock(
        overall
          ? {
              avgMin: overall.avgMin,
              avgMax: overall.avgMax,
              jobCount: overall.jobCount,
            }
          : null,
        currency,
      ),
      senioritySection(
        m.companySalaries_seniorityHeading(),
        salary.bySeniority,
        currency,
      ),
      railSection(
        m.companySalaries_otherCompaniesHiringLabel({
          category: salary.categoryName,
        }),
        salary.competitors.map((x) =>
          railItem(
            x.companyName,
            companyCategorySalaryPath(
              x.companySlug,
              salary.categoryCanonicalSlug,
            ),
            x,
            currency,
          ),
        ),
        seo.origin,
      ),
      faqSection(faqs),
    ],
    empty: m.salaryHub_emptyDescription(),
  });
}
