/**
 * The Markdown twins of the jobs listings: `/jobs`, its category and skill
 * pages, the locations directory and the location pages (work arrangements
 * included: `remote`, `hybrid` and `on-site` sit in the location slot).
 *
 * Each builder parses the twin's query with the page route's own search
 * validator and calls the page server function its loader calls, with the
 * same input, so `?page=2` and the filters mean what they mean on the page,
 * and board access, the password wall and Board API shedding are
 * unchanged. Like the page: a `remoteOption` that belongs in the path moves
 * to its work arrangement page, an alias slug moves to its canonical page,
 * and an unknown slug follows the board's configured redirect, else 404s.
 */
import {
  BOARD_PATHS,
  jobsCategoryPath,
  jobsLocationCategoryPath,
  jobsLocationPath,
  jobsLocationSkillPath,
  jobsSkillPath,
} from '@cavuno/board/paths';

import { placeLinkSlug } from '../../board/place-link';
import { buildPlaceHierarchy } from '../../components/board/place-directory-tree';
import {
  locationCategoryListingCopy,
  locationListingCopy,
  locationSkillListingCopy,
} from '../../copy-groups/location-listing';
import { readBoardContext } from '../../lib/board-context-cache';
import { entityCount } from '../../lib/entity-count';
import {
  JOBS_INDEX_PAGE_SIZE,
  jobsIndexPageInput,
  listingPageInput,
  parseJobsIndexSearch,
  parseJobsSearch,
  parseLocationJobsSearch,
  type JobsSearch,
} from '../../lib/jobs-search';
import { selfUrl } from '../../lib/self-url';
import { chromeEntity } from '../../lib/site-chrome';
import {
  workArrangementRedirect,
  type JobsListingRoute,
  type WorkArrangementTarget,
} from '../../lib/work-arrangement';
import { m } from '../../paraglide/messages';
import { getLocale } from '../../paraglide/runtime';
import { PROGRAMMATIC_JOBS_PAGE_SIZE } from '../../routes/-programmatic-jobs-constants';
import {
  getJobsCategoryPage,
  getJobsIndexPage,
  getJobsLocationCategoryPage,
  getJobsLocationPage,
  getJobsLocationSkillPage,
  getJobsLocationsIndexPage,
  getJobsSkillPage,
  type JobsListingFiltersInput,
} from '../jobs-listing-pages';
import { resolveRedirect } from '../queries';
import { escapeInline, link, markdownDocument } from './format';
import {
  canonicalOf,
  listingTwin,
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
import type { PublicPlace } from '@cavuno/board';

type Named = { displayName: string };
type PageInput<T> = { data: JobsListingFiltersInput & T };
type Located = { locationSlug: string; within?: number };
/** A taxonomy page's answer: no such term, a move to its canonical slug,
 * or the listing. */
type TaxonomyPage<Ok, Moved> =
  | { kind: 'not_found' }
  | ({ kind: 'redirect' } & Moved)
  | ({ kind: 'ok' } & ListingPageData & Ok);

/** The parts of the listing server functions' answers the twins read. */
export type ListingTwinDependencies = {
  getJobsIndexPage: (input: {
    data: ReturnType<typeof jobsIndexPageInput>;
  }) => Promise<Omit<ListingPageData, 'list'> & { page: JobCardPage }>;
  getJobsCategoryPage: (
    input: PageInput<{ categorySlug: string }>,
  ) => Promise<TaxonomyPage<{ category: Named }, { to: string }>>;
  getJobsSkillPage: (
    input: PageInput<{ skillSlug: string }>,
  ) => Promise<TaxonomyPage<{ skill: Named }, { to: string }>>;
  getJobsLocationsIndexPage: () => Promise<{
    places: { data: PublicPlace[] };
    seo: ListingPageData['seo'];
    head: ListingPageData['head'];
  }>;
  getJobsLocationPage: (
    input: PageInput<Located>,
  ) => Promise<TaxonomyPage<{ place: Named }, { to: string }>>;
  getJobsLocationCategoryPage: (
    input: PageInput<Located & { categorySlug: string }>,
  ) => Promise<
    TaxonomyPage<
      { place: Named; category: Named },
      { locationTo: string; keywordTo: string }
    >
  >;
  getJobsLocationSkillPage: (
    input: PageInput<Located & { skillSlug: string }>,
  ) => Promise<
    TaxonomyPage<
      { place: Named; skill: Named },
      { locationTo: string; skillTo: string }
    >
  >;
  resolveRedirect: ResolveRedirect;
  readBoardContext: () => Promise<JobFormSource>;
};

const defaultDependencies: ListingTwinDependencies = {
  getJobsIndexPage,
  getJobsCategoryPage,
  getJobsSkillPage,
  getJobsLocationsIndexPage,
  getJobsLocationPage,
  getJobsLocationCategoryPage,
  getJobsLocationSkillPage,
  resolveRedirect,
  readBoardContext,
};

/** The canonical path of a work arrangement redirect's target. */
function targetPath<Search>(target: WorkArrangementTarget<Search>): string {
  switch (target.to) {
    case '/jobs':
      return BOARD_PATHS.jobs;
    case '/jobs/$keyword':
      return jobsCategoryPath(target.params.keyword);
    case '/jobs/skills/$skill':
      return jobsSkillPath(target.params.skill);
    case '/jobs/locations/$location':
      return jobsLocationPath(target.params.location);
    case '/jobs/locations/$location/$keyword':
      return jobsLocationCategoryPath(
        target.params.location,
        target.params.keyword,
      );
    case '/jobs/locations/$location/skills/$skill':
      return jobsLocationSkillPath(target.params.location, target.params.skill);
  }
}

/** The move a `remoteOption` that belongs in the path needs, as the page's
 * `beforeLoad` makes it, or null. */
function arrangementRedirect(
  twin: MarkdownTwin,
  route: JobsListingRoute,
  search: JobsSearch,
): MarkdownTwinResult | null {
  const target = workArrangementRedirect(route, search);
  if (!target) return null;
  const query = new URLSearchParams(twin.search);
  query.delete('remoteOption');
  const rest = query.toString();
  return twinRedirect(targetPath(target), rest ? `?${rest}` : '');
}

type BuildContext = {
  twin: MarkdownTwin;
  origin: string;
  dependencies: ListingTwinDependencies;
};

/** A taxonomy page's answer as a twin: its listing, a move, or a miss. */
async function taxonomyTwin<Ok, Moved>(
  context: BuildContext,
  page: TaxonomyPage<Ok, Moved>,
  search: JobsSearch,
  moved: (page: Moved) => string,
  copy: (
    page: Ok,
  ) => Pick<Parameters<typeof listingTwin>[0], 'heading' | 'countedHeading'>,
): Promise<MarkdownTwinResult> {
  const { twin, origin, dependencies } = context;
  if (page.kind === 'not_found') {
    return managedRedirectTwin(twin, origin, dependencies.resolveRedirect);
  }
  if (page.kind === 'redirect') return twinRedirect(moved(page), twin.search);
  return listingTwin({
    twin,
    origin,
    data: page,
    jobForm: await dependencies.readBoardContext(),
    page: search.page ?? 1,
    pageSize: PROGRAMMATIC_JOBS_PAGE_SIZE,
    ...copy(page),
  });
}

export async function buildJobsTwin(
  twin: MarkdownTwin,
  origin: string,
  dependencies: ListingTwinDependencies = defaultDependencies,
): Promise<MarkdownTwinResult> {
  const search = parseJobsIndexSearch(routerSearch(twin));
  const moved = arrangementRedirect(twin, {}, search);
  if (moved) return moved;
  const page = await dependencies.getJobsIndexPage({
    data: jobsIndexPageInput(search),
  });
  return listingTwin({
    twin,
    origin,
    data: { ...page, list: page.page },
    jobForm: await dependencies.readBoardContext(),
    page: search.page ?? 1,
    pageSize: JOBS_INDEX_PAGE_SIZE,
  });
}

export async function buildJobsCategoryTwin(
  twin: MarkdownTwin,
  origin: string,
  dependencies: ListingTwinDependencies = defaultDependencies,
): Promise<MarkdownTwinResult> {
  const { keyword = '' } = twin.params;
  const search = parseJobsSearch(routerSearch(twin));
  const moved = arrangementRedirect(twin, { category: keyword }, search);
  if (moved) return moved;
  const page = await dependencies.getJobsCategoryPage({
    data: {
      categorySlug: keyword,
      ...listingPageInput(search, PROGRAMMATIC_JOBS_PAGE_SIZE),
    },
  });
  return taxonomyTwin(
    { twin, origin, dependencies },
    page,
    search,
    (redirect) => jobsCategoryPath(redirect.to),
    ({ category }) => ({
      heading: m.categoryPage_jobsHeading({ category: category.displayName }),
      countedHeading: (counted) =>
        m.categoryPage_jobsCountHeading({
          ...counted,
          category: category.displayName,
        }),
    }),
  );
}

export async function buildJobsSkillTwin(
  twin: MarkdownTwin,
  origin: string,
  dependencies: ListingTwinDependencies = defaultDependencies,
): Promise<MarkdownTwinResult> {
  const { skill: skillSlug = '' } = twin.params;
  const search = parseJobsSearch(routerSearch(twin));
  const moved = arrangementRedirect(twin, { skill: skillSlug }, search);
  if (moved) return moved;
  const page = await dependencies.getJobsSkillPage({
    data: {
      skillSlug,
      ...listingPageInput(search, PROGRAMMATIC_JOBS_PAGE_SIZE),
    },
  });
  return taxonomyTwin(
    { twin, origin, dependencies },
    page,
    search,
    (redirect) => jobsSkillPath(redirect.to),
    ({ skill }) => ({
      heading: m.skillPage_jobsHeading({ skill: skill.displayName }),
      countedHeading: (counted) =>
        m.skillPage_jobsCountHeading({ ...counted, skill: skill.displayName }),
    }),
  );
}

export async function buildJobsLocationsTwin(
  twin: MarkdownTwin,
  _origin: string,
  dependencies: ListingTwinDependencies = defaultDependencies,
): Promise<MarkdownTwinResult> {
  const page = await dependencies.getJobsLocationsIndexPage();
  const locale = getLocale();
  const overrides = {
    singular: chromeEntity().jobSingular,
    plural: chromeEntity().jobPlural,
  };
  const lines: string[] = [];
  const visit = (
    nodes: ReturnType<typeof buildPlaceHierarchy<PublicPlace>>,
    depth: number,
  ) => {
    for (const { place, children } of nodes) {
      const slug = placeLinkSlug(place);
      const name = slug
        ? link(
            place.displayName,
            selfUrl(page.seo.origin, jobsLocationPath(slug)),
          )
        : escapeInline(place.displayName);
      const count = entityCount(
        place.jobCount,
        locale,
        m.count_jobs,
        overrides,
      );
      lines.push(`${'  '.repeat(depth)}- ${name} · ${escapeInline(count)}`);
      visit(children, depth + 1);
    }
  };
  visit(
    buildPlaceHierarchy(page.places.data, (place) => place.jobCount),
    0,
  );
  const body = markdownDocument([
    `# ${escapeInline(m.jobsLocationsIndex_heading())}`,
    lines.length > 0
      ? lines.join('\n')
      : escapeInline(m.jobsLocationsIndex_emptyText()),
  ]);
  return { type: 'markdown', body, canonical: canonicalOf(page, twin) };
}

export async function buildJobsLocationTwin(
  twin: MarkdownTwin,
  origin: string,
  dependencies: ListingTwinDependencies = defaultDependencies,
): Promise<MarkdownTwinResult> {
  const { location = '' } = twin.params;
  const search = parseLocationJobsSearch(routerSearch(twin));
  const moved = arrangementRedirect(twin, { location }, search);
  if (moved) return moved;
  const page = await dependencies.getJobsLocationPage({
    data: {
      locationSlug: location,
      within: search.within,
      q: search.q,
      ...listingPageInput(search, PROGRAMMATIC_JOBS_PAGE_SIZE),
    },
  });
  return taxonomyTwin(
    { twin, origin, dependencies },
    page,
    search,
    (redirect) => jobsLocationPath(redirect.to),
    ({ place }) => locationListingCopy(location, place),
  );
}

export async function buildJobsLocationCategoryTwin(
  twin: MarkdownTwin,
  origin: string,
  dependencies: ListingTwinDependencies = defaultDependencies,
): Promise<MarkdownTwinResult> {
  const { location = '', keyword = '' } = twin.params;
  const search = parseLocationJobsSearch(routerSearch(twin));
  const moved = arrangementRedirect(
    twin,
    { location, category: keyword },
    search,
  );
  if (moved) return moved;
  const page = await dependencies.getJobsLocationCategoryPage({
    data: {
      locationSlug: location,
      categorySlug: keyword,
      within: search.within,
      ...listingPageInput(search, PROGRAMMATIC_JOBS_PAGE_SIZE),
    },
  });
  return taxonomyTwin(
    { twin, origin, dependencies },
    page,
    search,
    (redirect) =>
      jobsLocationCategoryPath(redirect.locationTo, redirect.keywordTo),
    ({ place, category }) =>
      locationCategoryListingCopy(location, place, category),
  );
}

export async function buildJobsLocationSkillTwin(
  twin: MarkdownTwin,
  origin: string,
  dependencies: ListingTwinDependencies = defaultDependencies,
): Promise<MarkdownTwinResult> {
  const { location = '', skill: skillSlug = '' } = twin.params;
  const search = parseLocationJobsSearch(routerSearch(twin));
  const moved = arrangementRedirect(
    twin,
    { location, skill: skillSlug },
    search,
  );
  if (moved) return moved;
  const page = await dependencies.getJobsLocationSkillPage({
    data: {
      locationSlug: location,
      skillSlug,
      within: search.within,
      ...listingPageInput(search, PROGRAMMATIC_JOBS_PAGE_SIZE),
    },
  });
  return taxonomyTwin(
    { twin, origin, dependencies },
    page,
    search,
    (redirect) => jobsLocationSkillPath(redirect.locationTo, redirect.skillTo),
    ({ place, skill }) => locationSkillListingCopy(location, place, skill),
  );
}
