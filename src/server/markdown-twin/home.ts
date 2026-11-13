/**
 * The home page's Markdown twin (`/index.md`).
 *
 * Reads through the same server function the home route loader calls, so
 * board access, the password wall and Board API shedding behave as they do
 * for the page, and no read is added. Sections follow the landing: the
 * hero, top categories, the latest jobs, hiring companies and recent posts,
 * each linking its full listing.
 */
import {
  BOARD_PATHS,
  blogPostPath,
  companyPath,
  jobsCategoryPath,
} from '@cavuno/board/paths';

import { readBoardContext } from '../../lib/board-context-cache';
import { entityCount } from '../../lib/entity-count';
import { selfUrl } from '../../lib/self-url';
import { chromeEntity } from '../../lib/site-chrome';
import { m } from '../../paraglide/messages';
import { getLocale } from '../../paraglide/runtime';
import { getHomePage } from '../home-page';
import {
  bulletList,
  escapeInline,
  link,
  markdownDocument,
  section,
} from './format';
import { canonicalOf, jobCardLine, type ListingPageData } from './job-listing';

import type { JobFormSource } from '../../board/job-form';
import type { MarkdownTwin } from '../../lib/markdown-twin/routes';
import type { HomeCopy } from '../home-copy';
import type { MarkdownTwinResult } from './result';
import type { PublicJobCard, RelatedSearch } from '@cavuno/board';

/** Category tiles on the landing. */
const HOME_CATEGORY_LIMIT = 8;

/** The parts of the home server function's answer the twin reads. */
export type HomeTwinDependencies = {
  getHomePage: () => Promise<{
    copy: Pick<
      HomeCopy,
      | 'heroTitle'
      | 'heroDescription'
      | 'jobsTitle'
      | 'jobsViewMoreText'
      | 'companiesTitle'
      | 'companiesViewMoreText'
      | 'blogTitle'
      | 'blogViewMoreText'
    >;
    page: { data: PublicJobCard[] };
    topCategories: RelatedSearch[];
    companies: ReadonlyArray<{
      slug: string;
      name: string;
      publishedJobCount: number;
    }>;
    posts: ReadonlyArray<{ slug: string; title: string }> | null;
    seo: ListingPageData['seo'];
    head: ListingPageData['head'];
  }>;
  readBoardContext: () => Promise<JobFormSource>;
};

const defaultDependencies: HomeTwinDependencies = {
  getHomePage,
  readBoardContext,
};

/** A section's list followed by its "view all" link. */
function withViewAll(
  list: string | null,
  label: string,
  url: string,
): string | null {
  return list ? `${list}\n\n${link(label, url)}` : null;
}

export async function buildHomeTwin(
  twin: MarkdownTwin,
  _origin: string,
  dependencies: HomeTwinDependencies = defaultDependencies,
): Promise<MarkdownTwinResult> {
  const [page, jobForm] = await Promise.all([
    dependencies.getHomePage(),
    dependencies.readBoardContext(),
  ]);
  const { copy, seo } = page;
  const locale = getLocale();
  const jobsLabel = {
    singular: chromeEntity().jobSingular,
    plural: chromeEntity().jobPlural,
  };

  const categories = [...page.topCategories]
    .sort((a, b) => b.count - a.count)
    .slice(0, HOME_CATEGORY_LIMIT)
    .map((category) => {
      const name = link(
        category.displayName,
        selfUrl(seo.origin, jobsCategoryPath(category.canonicalSlug)),
      );
      return category.count > 0
        ? `${name} · ${escapeInline(entityCount(category.count, locale, m.count_jobs, jobsLabel))}`
        : name;
    });
  const companies = page.companies
    .filter((company) => company.publishedJobCount > 0)
    .map((company) => {
      const openJobs = m.companyDetail_openJobsCount({
        count: company.publishedJobCount,
        countLabel: company.publishedJobCount.toLocaleString(locale),
      });
      return `${link(company.name, selfUrl(seo.origin, companyPath(company.slug)))} · ${escapeInline(openJobs)}`;
    });
  const posts = (page.posts ?? []).map((post) =>
    link(post.title, selfUrl(seo.origin, blogPostPath(post.slug))),
  );

  const body = markdownDocument([
    `# ${escapeInline(copy.heroTitle)}`,
    copy.heroDescription ? escapeInline(copy.heroDescription) : null,
    section(m.home_categoriesHeading(), bulletList(categories)),
    section(
      copy.jobsTitle,
      withViewAll(
        bulletList(
          page.page.data.map((job) => jobCardLine(job, seo.origin, jobForm)),
        ),
        copy.jobsViewMoreText,
        selfUrl(seo.origin, BOARD_PATHS.jobs),
      ) ?? escapeInline(m.home_emptyHeading()),
    ),
    section(
      copy.companiesTitle,
      withViewAll(
        bulletList(companies),
        copy.companiesViewMoreText,
        selfUrl(seo.origin, BOARD_PATHS.companies),
      ),
    ),
    section(
      copy.blogTitle,
      withViewAll(
        bulletList(posts),
        copy.blogViewMoreText,
        selfUrl(seo.origin, BOARD_PATHS.blog),
      ),
    ),
  ]);
  return { type: 'markdown', body, canonical: canonicalOf(page, twin) };
}
