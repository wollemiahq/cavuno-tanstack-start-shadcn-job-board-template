import { describe, expect, it } from 'vitest';

import { productJsonLd } from './product-json-ld';

import type { Product } from '@cavuno/board';

function product(overrides: Partial<Product> = {}): Product {
  return {
    object: 'product',
    slug: 'salary-report',
    name: 'Salary report',
    description: null,
    summary: 'A 48-page PDF.',
    details: [],
    images: ['https://cdn.example/cover.png'],
    buttonLabel: null,
    price: { kind: 'fixed', currency: 'usd', amountCents: 1900 },
    soldOut: false,
    refundPolicy: null,
    questions: [],
    contents: [],
    facts: {
      fileCount: 1,
      linkCount: 0,
      fileTypes: ['pdf'],
      pageCount: 48,
      totalSizeBytes: 1000,
    },
    isListed: true,
    ratingsEnabled: false,
    rating: null,
    url: '/products/salary-report',
    ...overrides,
  };
}

const URL = 'https://jobs.example/products/salary-report';

describe('productJsonLd', () => {
  it('offers a paid product at its price and availability', () => {
    expect(productJsonLd(product(), URL)).toMatchObject({
      '@type': 'Product',
      name: 'Salary report',
      url: URL,
      offers: {
        '@type': 'Offer',
        price: '19.00',
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
      },
    });
    expect(
      productJsonLd(product({ soldOut: true }), URL).offers?.availability,
    ).toBe('https://schema.org/SoldOut');
  });

  it('has no offer for a free product (no currency)', () => {
    const free = product({
      price: { kind: 'free', currency: null, amountCents: 0 },
    });
    expect(productJsonLd(free, URL).offers).toBeUndefined();
  });

  it('adds an aggregate rating only when buyers have rated it', () => {
    const unrated = product({
      ratingsEnabled: true,
      rating: { average: null, count: 0, histogram: [0, 0, 0, 0, 0] },
    });
    expect(productJsonLd(unrated, URL).aggregateRating).toBeUndefined();

    const rated = product({
      ratingsEnabled: true,
      rating: { average: 4.75, count: 23, histogram: [0, 0, 1, 4, 18] },
    });
    expect(productJsonLd(rated, URL).aggregateRating).toMatchObject({
      ratingValue: 4.8,
      reviewCount: 23,
    });
  });
});
