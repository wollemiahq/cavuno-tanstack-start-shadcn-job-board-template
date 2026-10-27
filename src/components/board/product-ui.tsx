/**
 * Shared digital-product presentation: the cover image, the price text,
 * the buy button's words, the star rating and the listing's product card.
 * Every value comes from the Board API wire shapes through
 * src/board/product-view-model.ts.
 */
import { Link } from '@tanstack/react-router';
import { Star } from 'lucide-react';

import { m } from '../../paraglide/messages';
import { getLocale } from '../../paraglide/runtime';

import {
  formatRating,
  priceLabel,
  type PriceLabel,
} from '@/board/product-view-model';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { hideBrokenImage } from '@/lib/hide-broken-image';
import { cn } from '@/lib/utils';
import type {
  ProductCard as ProductCardData,
  ProductPrice,
} from '@cavuno/board';

/** "Free", "$19" or "$5+". */
export function priceText(label: PriceLabel): string {
  if (label.kind === 'free') return m.product_priceFree();
  if (label.kind === 'fixed') return label.amount;
  return m.product_pricePayWhatYouWant({ minimum: label.minimum });
}

export function productPriceText(price: ProductPrice): string {
  return priceText(priceLabel(price, getLocale()));
}

/**
 * The seller's button wording. The API sends one of the dashboard's preset
 * keys; anything else is shown as written. With none chosen the button says
 * "Buy now", or "Get it free" on a free product.
 */
export function productButtonText(product: {
  buttonLabel: string | null;
  price: Pick<ProductPrice, 'kind'>;
}): string {
  switch (product.buttonLabel?.trim() || null) {
    case null:
      return product.price.kind === 'free'
        ? m.product_getFreeAction()
        : m.product_buyAction();
    case 'i_want_this':
      return m.product_iWantThisAction();
    case 'buy_this':
      return m.product_buyThisAction();
    case 'pay':
      return m.product_payAction();
    case 'get_this':
      return m.product_getThisAction();
    case 'download':
      return m.product_downloadAction();
    default:
      return product.buttonLabel ?? '';
  }
}

/** A product image, or a muted block of the same shape when there is none. */
export function ProductCover({
  src,
  className,
  size = 'hero',
}: {
  src: string | null | undefined;
  className?: string;
  /** `hero`: the product page; `card`: the listing grid; `thumb`: rows. */
  size?: 'hero' | 'card' | 'thumb';
}) {
  const frame =
    size === 'hero'
      ? 'aspect-[2/1] w-full rounded-2xl'
      : size === 'card'
        ? 'aspect-[2/1] w-full'
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

/** Read-only stars; a fractional average fills to the nearest whole star. */
export function ReviewStars({
  stars,
  className,
}: {
  stars: number;
  className?: string;
}) {
  const filled = Math.round(stars);
  return (
    <span
      className={cn('inline-flex items-center gap-0.5', className)}
      role="img"
      aria-label={m.product_starsAriaLabel({ stars: filled })}
    >
      {[1, 2, 3, 4, 5].map((value) => (
        <Star
          key={value}
          aria-hidden="true"
          className={cn(
            'size-3.5',
            value <= filled
              ? 'text-foreground fill-current'
              : 'text-muted-foreground/40',
          )}
        />
      ))}
    </span>
  );
}

/** One product in the `/products` grid: cover, name, summary, price, rating. */
export function ProductGridCard({ product }: { product: ProductCardData }) {
  return (
    <Link
      to="/products/$productSlug"
      params={{ productSlug: product.slug }}
      className="group focus-visible:ring-ring/50 block h-full rounded-[min(var(--radius-4xl),24px)] outline-none focus-visible:ring-3"
    >
      <Card
        size="sm"
        className="group-hover:ring-foreground/15 h-full gap-0 py-0 transition-shadow group-hover:shadow-md"
      >
        <ProductCover src={product.coverImageUrl} size="card" />
        <CardContent className="flex flex-1 flex-col gap-1 p-4">
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
          <div className="mt-auto flex flex-wrap items-center gap-2 pt-2 text-sm">
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
        </CardContent>
      </Card>
    </Link>
  );
}
