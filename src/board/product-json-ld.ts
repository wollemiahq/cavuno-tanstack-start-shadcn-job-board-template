/**
 * schema.org `Product` for a listed digital product page, mirroring the job
 * page's JobPosting: one `Offer` at the page URL (the price, or the minimum
 * for pay what you want) and an `AggregateRating` only when buyers have
 * actually rated it. A free product has no currency, so it carries no Offer.
 */
import type { Product } from '@cavuno/board';

export type ProductJsonLd = {
  '@context': 'https://schema.org';
  '@type': 'Product';
  name: string;
  url: string;
  description?: string;
  image?: string[];
  offers?: {
    '@type': 'Offer';
    url: string;
    price: string;
    priceCurrency: string;
    availability: string;
  };
  aggregateRating?: {
    '@type': 'AggregateRating';
    ratingValue: number;
    reviewCount: number;
    bestRating: 5;
    worstRating: 1;
  };
};

export function productJsonLd(product: Product, url: string): ProductJsonLd {
  const jsonLd: ProductJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    url,
  };
  if (product.summary) jsonLd.description = product.summary;
  if (product.images.length > 0) jsonLd.image = product.images;
  const currency = product.price.currency;
  if (currency) {
    jsonLd.offers = {
      '@type': 'Offer',
      url,
      price: (product.price.amountCents / 100).toFixed(2),
      priceCurrency: currency.toUpperCase(),
      availability: product.soldOut
        ? 'https://schema.org/SoldOut'
        : 'https://schema.org/InStock',
    };
  }
  const rating = product.rating;
  if (
    product.ratingsEnabled &&
    rating &&
    rating.count > 0 &&
    rating.average !== null
  ) {
    jsonLd.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: Math.round(rating.average * 10) / 10,
      reviewCount: rating.count,
      bestRating: 5,
      worstRating: 1,
    };
  }
  return jsonLd;
}
