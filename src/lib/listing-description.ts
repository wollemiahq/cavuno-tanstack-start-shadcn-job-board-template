import { m } from '../paraglide/messages';
import { isLocale } from '../paraglide/runtime';
/**
 * Jobs-listing head copy — application-owned title and meta description for
 * `listingHead({ title, description })`. The SDK no longer composes either.
 */
import { jobCountLabel } from './job-count-label';
import { pageTitle } from './page-title';

function finiteCount(count: number | undefined): number | undefined {
  if (count === undefined || !Number.isFinite(count)) return undefined;
  return count;
}

/**
 * A listing heading with its count, inflected for it: "1 Ansible job in Fort
 * Meade", "93 Ansible jobs in Fort Meade". `countLabel` is `count` formatted
 * for the locale.
 */
export type CountedHeading = (counted: {
  count: number;
  countLabel: string;
}) => string;

/**
 * Document title for a jobs listing page. Application owns counters, the
 * heading, separator, and board name — same pipe format as `pageTitle`.
 */
export function listingPageTitle(options: {
  heading: string;
  /** The heading with the count; without it the count is prefixed as is. */
  countedHeading?: CountedHeading;
  boardName: string;
  language: string;
  count?: number;
  /** `count` is the Board API's ranking limit: it reads "1,000+". */
  countCapped?: boolean;
}): string {
  const count = finiteCount(options.count);
  const countLabel =
    count !== undefined
      ? jobCountLabel(count, options.language, options.countCapped)
      : undefined;
  const page =
    count === undefined || countLabel === undefined
      ? options.heading
      : options.countedHeading
        ? options.countedHeading({ count, countLabel })
        : `${countLabel} ${options.heading}`;
  return pageTitle([page], options.boardName);
}

/** Plain jobs-index title uses the same plural-aware copy as its result count. */
export function jobsIndexPageTitle(options: {
  boardName: string;
  language: string;
  count?: number;
  /** `count` is the Board API's ranking limit: it reads "1,000+". */
  countCapped?: boolean;
}): string {
  const count = finiteCount(options.count);
  const locale = isLocale(options.language)
    ? { locale: options.language }
    : undefined;
  const label =
    count === undefined
      ? m.jobSearch_headingJobs({}, locale)
      : m.jobSearch_resultsCount(
          {
            count,
            countLabel: jobCountLabel(
              count,
              options.language,
              options.countCapped,
            ),
          },
          locale,
        );
  return pageTitle([label], options.boardName);
}

/** Meta description for a jobs listing page. */
export function listingMetaDescription(options: {
  heading: string;
  /** The heading with the count, so one result reads in the singular. */
  countedHeading?: CountedHeading;
  boardName: string;
  count?: number;
  /** `count` is the Board API's ranking limit: it reads "1,000+". */
  countCapped?: boolean;
}): string {
  const count = finiteCount(options.count);
  if (count !== undefined && options.countedHeading) {
    const countLabel = options.countCapped
      ? m.jobSearch_cappedCountLabel({ count: String(count) })
      : String(count);
    return m.listing_metaDescription({
      heading: options.countedHeading({ count, countLabel }),
      boardName: options.boardName,
    });
  }
  if (count !== undefined) {
    return m.listing_metaDescriptionWithCount({
      count,
      heading: options.heading,
      boardName: options.boardName,
    });
  }
  return m.listing_metaDescription({
    heading: options.heading,
    boardName: options.boardName,
  });
}
