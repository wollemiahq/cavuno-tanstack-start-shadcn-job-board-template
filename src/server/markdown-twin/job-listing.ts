/**
 * The Markdown shared by the job listing twins (home, `/jobs` and its
 * category, skill and location pages): one line per job card, the result
 * heading and range, and links to the neighbouring pages' twins.
 *
 * Copy, counts and labels come from the same helpers the listing page
 * renders with, so the twin reads like the page.
 */
import { jobDetailPath } from '@cavuno/board/paths';

import {
  catalogJobCount,
  visiblePageSpan,
} from '../../board/job-catalog-count';
import { toJobCardVM } from '../../board/job-view-model';
import {
  relatedSearchesTitle,
  relatedSearchesToChips,
} from '../../board/related-searches';
import { entityCount } from '../../lib/entity-count';
import {
  clampPage,
  listingPageHref,
  pageableCount,
  totalPages,
} from '../../lib/pagination';
import { resultsShowingLine } from '../../lib/results-showing';
import { selfUrl } from '../../lib/self-url';
import { chromeEntity } from '../../lib/site-chrome';
import { m } from '../../paraglide/messages';
import { getLocale } from '../../paraglide/runtime';
import {
  bulletList,
  escapeInline,
  htmlToMarkdown,
  link,
  markdownDocument,
  section,
} from './format';

import type { JobFormSource } from '../../board/job-form';
import type { CountedHeading } from '../../lib/listing-description';
import type { MarkdownTwin } from '../../lib/markdown-twin/routes';
import type { MarkdownTwinResult } from './result';
import type { PublicJobCard, RelatedSearch } from '@cavuno/board';

/** One page of job cards, as the listing server functions return it. */
export type JobCardPage = {
  data: PublicJobCard[];
  count?: number;
  gatedCount?: number;
};

/** The parts of a listing page server function's answer a twin reads. */
export type ListingPageData = {
  list: JobCardPage;
  reachableCount?: number;
  relatedSearches?: RelatedSearch[];
  introHtml?: string;
  seo: { origin: string };
  head: { links: ReadonlyArray<{ rel: string; href: string }> };
};

/** The page's canonical URL, for the twin's `Link` header. */
export function canonicalOf(
  page: Pick<ListingPageData, 'seo' | 'head'>,
  twin: MarkdownTwin,
): string {
  return (
    page.head.links.find((entry) => entry.rel === 'canonical')?.href ??
    `${page.seo.origin}${twin.htmlPath}`
  );
}

/**
 * A job card as one line: the title linking the job's page, then the
 * company, place, salary and age the card shows.
 */
export function jobCardLine(
  job: PublicJobCard,
  origin: string,
  jobForm: JobFormSource,
): string | null {
  const vm = toJobCardVM(job, getLocale(), jobForm);
  if (!vm.companySlug || !vm.jobSlug) return null;
  const url = selfUrl(origin, jobDetailPath(vm.companySlug, vm.jobSlug));
  const facts = [
    vm.companyName,
    vm.locationLabel,
    vm.salaryLabel,
    vm.postedAtLabel,
  ].flatMap((fact) => (fact ? [escapeInline(fact)] : []));
  return [link(vm.title, url), ...facts].join(' · ');
}

/** The listing heading with its total, as the results bar shows it. */
function countedTitle(
  total: number | undefined,
  heading: string | undefined,
  countedHeading: CountedHeading | undefined,
): string {
  const locale = getLocale();
  if (total === undefined) return heading ?? m.jobSearch_headingJobs();
  if (countedHeading) {
    return countedHeading({
      count: total,
      countLabel: total.toLocaleString(locale),
    });
  }
  if (heading) {
    return m.jobSearch_contextualResultsHeading({
      count: total.toLocaleString(locale),
      heading,
    });
  }
  return entityCount(total, locale, m.count_jobs, {
    singular: chromeEntity().jobSingular,
    plural: chromeEntity().jobPlural,
  });
}

/** Previous and next links to this listing's twin pages. */
function pageLinks(
  twin: MarkdownTwin,
  origin: string,
  page: number,
  total: number,
): string | null {
  const href = (target: number) =>
    `${origin}${listingPageHref(`${twin.twinPath}${twin.search}`, target, [
      'selectedJob',
    ])}`;
  return bulletList([
    page > 1 ? link(m.pagination_previousPageLabel(), href(page - 1)) : null,
    page < total ? link(m.pagination_nextPageLabel(), href(page + 1)) : null,
  ]);
}

/** A job listing page's twin. */
export function listingTwin(options: {
  twin: MarkdownTwin;
  /** The origin the twin is served on, for its page links. */
  origin: string;
  data: ListingPageData;
  jobForm: JobFormSource;
  /** The requested 1-based page. */
  page: number;
  pageSize: number;
  heading?: string;
  countedHeading?: CountedHeading;
}): MarkdownTwinResult {
  const { twin, data, pageSize } = options;
  const { list, reachableCount } = data;
  const siteOrigin = data.seo.origin;
  // The page served the last reachable page for anything deeper.
  const page = clampPage(options.page, pageSize, reachableCount);
  const visible = list.count ?? list.data.length;
  const total = catalogJobCount(list.count, list.gatedCount);
  const span = visiblePageSpan(
    page,
    pageSize,
    pageableCount(visible, reachableCount),
  );
  const locale = getLocale();
  const range =
    span && total !== undefined
      ? resultsShowingLine({ ...span, count: total }, locale, {
          single: (labels) => m.jobSearch_resultsShowingCount(labels),
          lastPage: (labels) => m.jobSearch_resultsShowingLast(labels),
          range: (labels) => m.jobSearch_resultsShowingRange(labels),
        })
      : null;
  const jobs = bulletList(
    list.data.map((job) => jobCardLine(job, siteOrigin, options.jobForm)),
  );
  const related = relatedSearchesToChips(data.relatedSearches);

  const body = markdownDocument([
    `# ${escapeInline(countedTitle(total, options.heading, options.countedHeading))}`,
    data.introHtml ? htmlToMarkdown(data.introHtml) : null,
    range ? escapeInline(range) : null,
    jobs ?? escapeInline(m.jobSearch_noMatchingResultsHeading()),
    pageLinks(
      twin,
      options.origin,
      page,
      totalPages(visible, pageSize, reachableCount),
    ),
    section(
      relatedSearchesTitle(),
      bulletList(
        related.map((chip) => link(chip.name, selfUrl(siteOrigin, chip.href))),
      ),
    ),
  ]);
  return { type: 'markdown', body, canonical: canonicalOf(data, twin) };
}
