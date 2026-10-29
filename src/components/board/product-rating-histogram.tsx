/**
 * The top of a product's reviews: the average, its stars and the number of
 * ratings beside one bar per star (5 down to 1) with each star's share.
 */
import { m } from '../../paraglide/messages';
import { getLocale } from '../../paraglide/runtime';

import {
  formatRating,
  formatShare,
  ratingHistogramRows,
} from '@/board/product-view-model';
import { ReviewStars } from '@/components/board/product-ui';
import type { Product } from '@cavuno/board';

export function ProductRatingHistogram({
  rating,
}: {
  rating: NonNullable<Product['rating']>;
}) {
  const locale = getLocale();
  const rows = ratingHistogramRows(rating.histogram);
  return (
    <div
      data-slot="product-rating-histogram"
      className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8"
    >
      {rating.average !== null ? (
        <div className="flex shrink-0 flex-col gap-1">
          <span className="text-foreground text-4xl font-semibold">
            {formatRating(locale, rating.average)}
          </span>
          <span aria-hidden="true">
            <ReviewStars stars={rating.average} />
          </span>
          <span className="text-muted-foreground text-sm">
            {m.product_ratingCount({ count: rating.count })}
          </span>
        </div>
      ) : null}
      <ul
        aria-label={m.product_ratingDistributionLabel()}
        className="grid min-w-0 flex-1 grid-cols-[auto_minmax(0,1fr)_auto] gap-x-3 gap-y-1.5 text-sm"
      >
        {rows.map((row) => (
          <li
            key={row.stars}
            data-stars={row.stars}
            className="col-span-3 grid grid-cols-subgrid items-center"
          >
            <span className="text-foreground whitespace-nowrap">
              {m.product_starsAriaLabel({ stars: row.stars })}
            </span>
            <span
              aria-hidden="true"
              className="bg-muted h-2 overflow-hidden rounded-full"
            >
              <span
                className="bg-foreground block h-full rounded-full"
                style={{ width: `${Math.round(row.share * 100)}%` }}
              />
            </span>
            <span className="text-muted-foreground text-end tabular-nums">
              {formatShare(locale, row.share)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
