import { describe, expect, it } from 'vitest';

import { routeOwnsHeaderActions } from './header-route-actions';

import { Route as CompaniesRoute } from '@/routes/companies.index';
import { Route as ProductRoute } from '@/routes/products.$productSlug';
import { Route as ProductsRoute } from '@/routes/products.index';

const root = { staticData: {}, status: 'success' };

describe('routeOwnsHeaderActions', () => {
  it('is true on the product page only', () => {
    expect(
      routeOwnsHeaderActions([
        root,
        { staticData: ProductRoute.options.staticData, status: 'success' },
      ]),
    ).toBe(true);
    expect(
      routeOwnsHeaderActions([
        root,
        { staticData: ProductsRoute.options.staticData, status: 'success' },
      ]),
    ).toBe(false);
    expect(
      routeOwnsHeaderActions([
        root,
        { staticData: CompaniesRoute.options.staticData, status: 'success' },
      ]),
    ).toBe(false);
  });

  it('gives the usual header back to a product that is not found', () => {
    expect(
      routeOwnsHeaderActions([
        root,
        { staticData: ProductRoute.options.staticData, status: 'notFound' },
      ]),
    ).toBe(false);
  });
});
