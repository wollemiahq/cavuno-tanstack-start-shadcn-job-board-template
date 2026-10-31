/**
 * `/products` — the board's digital product catalogue. Head meta and the
 * breadcrumb JSON-LD are computed in `getProductsPage`, which 404s when the
 * board lists no products at all.
 */
import { createFileRoute, useNavigate } from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import { getProductsPage } from '../server/products';
import { ProductsPageView } from './-products-page';

import { jsonLdHeadScripts } from '@/components/json-ld';
import {
  nextProductsSearch,
  parseProductsSearch,
  productsLoaderDeps,
  productsSearchResetsScroll,
  type ProductsSearch,
} from '@/lib/products-search';

export const cavunoPage = 'products';

export const Route = createFileRoute('/products/')({
  staticData: {
    fullBleed: true,
    ownsMain: true,
    headerSearchScope: 'products',
  },
  validateSearch: parseProductsSearch,
  loaderDeps: ({ search }) => productsLoaderDeps(search),
  loader: ({ deps }) => getProductsPage({ data: deps }),
  head: ({ loaderData, match }) =>
    loaderData
      ? { ...loaderData.head, scripts: jsonLdHeadScripts(loaderData.jsonLd) }
      : match.status === 'notFound'
        ? // The loader threw notFound(): a board with no listed products.
          // Title the 404 as one, never as the store it failed to render.
          { meta: [{ title: m.notFound_heading() }] }
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
          resetScroll: productsSearchResetsScroll(change),
        })
      }
    />
  );
}
