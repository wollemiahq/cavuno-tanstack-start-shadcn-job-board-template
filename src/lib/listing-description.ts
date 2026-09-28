import { m } from '../paraglide/messages';
import { isLocale } from '../paraglide/runtime';
/**
 * Jobs-listing head copy — application-owned title and meta description for
 * `listingHead({ title, description })`. The SDK no longer composes either.
 */
import { pageTitle } from './page-title';

function finiteCount(count: number | undefined): number | undefined {
  if (count === undefined || !Number.isFinite(count)) return undefined;
  return count;
}

/**
 * Document title for a jobs listing page. Application owns counters, the
 * heading, separator, and board name — same pipe format as `pageTitle`.
 */
export function listingPageTitle(options: {
  heading: string;
  boardName: string;
  language: string;
  count?: number;
}): string {
  const count = finiteCount(options.count);
  const page =
    count !== undefined
      ? `${new Intl.NumberFormat(options.language).format(count)} ${options.heading}`
      : options.heading;
  return pageTitle([page], options.boardName);
}

/** Plain jobs-index title uses the same plural-aware copy as its result count. */
export function jobsIndexPageTitle(options: {
  boardName: string;
  language: string;
  count?: number;
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
            countLabel: new Intl.NumberFormat(options.language).format(count),
          },
          locale,
        );
  return pageTitle([label], options.boardName);
}

/** Meta description for a jobs listing page. */
export function listingMetaDescription(options: {
  heading: string;
  boardName: string;
  count?: number;
}): string {
  const count = finiteCount(options.count);
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
