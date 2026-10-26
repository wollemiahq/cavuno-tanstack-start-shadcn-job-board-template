/**
 * `/products` — the board's digital product catalogue. Head meta and the
 * breadcrumb JSON-LD are computed in `getProductsPage`.
 */
import { createFileRoute, useNavigate } from '@tanstack/react-router';

import { getProductsPage } from '../server/products';
import { ProductsPageView } from './-products-page';

import { jsonLdHeadScripts } from '@/components/json-ld';
import {
  nextProductsSearch,
  parseProductsSearch,
  productsLoaderDeps,
  type ProductsSearch,
} from '@/lib/products-search';

export const cavunoPage = 'products';

export const Route = createFileRoute('/products/')({
  staticData: { fullBleed: true, ownsMain: true, fillsViewport: true },
  validateSearch: parseProductsSearch,
  loaderDeps: ({ search }) => productsLoaderDeps(search),
  loader: ({ deps }) => getProductsPage({ data: deps }),
  head: ({ loaderData }) =>
    loaderData
      ? { ...loaderData.head, scripts: jsonLdHeadScripts(loaderData.jsonLd) }
      : {},
  component: ProductsPage,
});

function ProductsPage() {
  const { page } = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  return (
    <ProductsPageView
      page={page}
      search={search}
      onSearchChange={(change, options) =>
        void navigate({
          search: (previous: ProductsSearch) =>
            nextProductsSearch(previous, change),
          replace: options?.replace,
          resetScroll: false,
        })
      }
    />
  );
}
