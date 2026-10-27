/**
 * Shared digital-product presentation: the cover image, the price text,
 * the star rating and the listing's result card. Every value comes from
 * the Board API wire shapes through src/board/product-view-model.ts.
 */
import { Star } from 'lucide-react';

import { m } from '../../paraglide/messages';
import { getLocale } from '../../paraglide/runtime';

import {
  formatRating,
  priceLabel,
  type PriceLabel,
} from '@/board/product-view-model';
import { MasterDetailLink } from '@/components/master-detail-link';
import { SearchResultCard } from '@/components/search-results/search-results';
import { Badge } from '@/components/ui/badge';
import { hideBrokenImage } from '@/lib/hide-broken-image';
import { productDestination } from '@/lib/master-detail-destination';
import { cn } from '@/lib/utils';
import type { ProductCard, ProductPrice } from '@cavuno/board';

/** "Free", "$19" or "$5+". */
export function priceText(label: PriceLabel): string {
  if (label.kind === 'free') return m.product_priceFree();
  if (label.kind === 'fixed') return label.amount;
  return m.product_pricePayWhatYouWant({ minimum: label.minimum });
}

export function productPriceText(price: ProductPrice): string {
  return priceText(priceLabel(price, getLocale()));
}

/** A product image, or a muted block of the same shape when there is none. */
export function ProductCover({
  src,
  className,
  size = 'hero',
}: {
  src: string | null | undefined;
  className?: string;
  size?: 'hero' | 'thumb';
}) {
  const frame =
    size === 'hero'
      ? 'aspect-[2/1] w-full rounded-2xl'
      : 'h-20 w-16 shrink-0 rounded-lg';
  return src ? (
    <img
      src={src}
      alt=""
      loading={size === 'hero' ? 'eager' : 'lazy'}
      className={cn('bg-muted object-cover', frame, className)}
      onError={hideBrokenImage}
    />
  ) : (
    <div aria-hidden="true" className={cn('bg-muted', frame, className)} />
  );
}

/** "★ 4.8 (23)" with an accessible sentence; nothing when unrated. */
export function RatingSummary({
  average,
  count,
  className,
}: {
  average: number | null;
  count: number;
  className?: string;
}) {
  if (average === null || count === 0) return null;
  const value = formatRating(getLocale(), average);
  return (
    <span
      className={cn('inline-flex items-center gap-1', className)}
      aria-label={m.product_ratingAriaLabel({ rating: value, count })}
    >
      <Star aria-hidden="true" className="size-3.5 fill-current" />
      <span aria-hidden="true">
        {m.product_ratingShort({ rating: value, count })}
      </span>
    </span>
  );
}

/** Read-only stars for one review. */
export function ReviewStars({ stars }: { stars: number }) {
  return (
    <span
      className="inline-flex items-center gap-0.5"
      role="img"
      aria-label={m.product_starsAriaLabel({ stars })}
    >
      {[1, 2, 3, 4, 5].map((value) => (
        <Star
          key={value}
          aria-hidden="true"
          className={cn(
            'size-3.5',
            value <= stars
              ? 'text-foreground fill-current'
              : 'text-muted-foreground/40',
          )}
        />
      ))}
    </span>
  );
}

/** One product in the `/products` list (desktop selects in place). */
export function ProductSearchResult({
  product,
  selected = false,
}: {
  product: ProductCard;
  selected?: boolean;
}) {
  return (
    <SearchResultCard selected={selected} className="p-0">
      <MasterDetailLink
        destination={productDestination({ productSlug: product.slug })}
        aria-current={selected ? 'true' : undefined}
        className="block rounded-[inherit] p-4 outline-none"
      >
        <div className="flex items-start gap-3">
          <ProductCover src={product.coverImageUrl} size="thumb" />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h2
              className="text-foreground line-clamp-2 text-base font-semibold"
              dir="auto"
            >
              {product.name}
            </h2>
            {product.summary ? (
              <p
                className="text-muted-foreground line-clamp-2 text-sm"
                dir="auto"
              >
                {product.summary}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-foreground font-semibold">
                {productPriceText(product.price)}
              </span>
              <RatingSummary
                average={product.rating?.average ?? null}
                count={product.rating?.count ?? 0}
                className="text-muted-foreground"
              />
              {product.soldOut ? (
                <Badge variant="outline">{m.product_soldOutLabel()}</Badge>
              ) : null}
            </div>
          </div>
        </div>
      </MasterDetailLink>
    </SearchResultCard>
  );
}
