import { m } from '../paraglide/messages';
/**
 * Jobs-listing head copy — application-owned title and meta description for
 * `listingHead({ title, description })`. The SDK no longer composes either.
 */
import { pageTitle } from './page-title';

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
  const page =
    typeof options.count === 'number'
      ? `${new Intl.NumberFormat(options.language).format(options.count)} ${options.heading}`
      : options.heading;
  return pageTitle([page], options.boardName);
}

/** Meta description for a jobs listing page. */
export function listingMetaDescription(options: {
  heading: string;
  boardName: string;
  count?: number;
}): string {
  if (typeof options.count === 'number') {
    return m.listing_metaDescriptionWithCount({
      count: options.count,
      heading: options.heading,
      boardName: options.boardName,
    });
  }
  return m.listing_metaDescription({
    heading: options.heading,
    boardName: options.boardName,
  });
}
