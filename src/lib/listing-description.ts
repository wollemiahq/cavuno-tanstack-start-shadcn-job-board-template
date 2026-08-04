/**
 * Jobs-listing meta description — application-owned sentence for
 * `listingHead({ description })`. The SDK no longer composes this.
 */
import { m } from '../paraglide/messages';

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
