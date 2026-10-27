/**
 * The `/products` URL contract: `q` (search words), `price` (`free` / `paid`),
 * `sort` and an opaque `cursor`.
 * Public input, so parsing never throws: unknown values drop out.
 */
import {
  cursorSearchValue,
  searchQueryString,
  searchString,
  type UrlSearchInput,
} from '@/lib/pagination';

export const PRODUCT_SORTS = [
  'featured',
  'newest',
  'rating',
  'price_asc',
] as const;
export type ProductSort = (typeof PRODUCT_SORTS)[number];
export const PRODUCT_PRICE_FILTERS = ['free', 'paid'] as const;
export type ProductPriceFilter = (typeof PRODUCT_PRICE_FILTERS)[number];

export interface ProductsSearch {
  q?: string;
  price?: ProductPriceFilter;
  /** `featured` is the default and stays out of the URL. */
  sort?: Exclude<ProductSort, 'featured'>;
  cursor?: string;
}

function oneOf<T extends string>(
  values: readonly T[],
  raw: UrlSearchInput[string],
): T | undefined {
  const text = searchString(raw);
  return values.find((value) => value === text);
}

export function parseProductsSearch(search: UrlSearchInput): ProductsSearch {
  const sort = oneOf(PRODUCT_SORTS, search.sort);
  return {
    q: searchQueryString(search.q),
    price: oneOf(PRODUCT_PRICE_FILTERS, search.price),
    sort: sort === 'featured' ? undefined : sort,
    cursor: cursorSearchValue(search.cursor),
  };
}

/** The listing request: every search value. */
export function productsLoaderDeps(search: ProductsSearch): ProductsSearch {
  return {
    q: search.q,
    price: search.price,
    sort: search.sort,
    cursor: search.cursor,
  };
}

/** What the listing changes: a page, or the filters. */
export type ProductsSearchChange =
  | { kind: 'page'; cursor: string | undefined }
  | {
      kind: 'filter';
      filters: Partial<Pick<ProductsSearch, 'q' | 'price' | 'sort'>>;
    };

/**
 * The next URL search: a new search or filter starts again from the first
 * page.
 */
export function nextProductsSearch(
  previous: ProductsSearch,
  change: ProductsSearchChange,
): ProductsSearch {
  switch (change.kind) {
    case 'page':
      return { ...previous, cursor: change.cursor };
    case 'filter':
      return { ...previous, ...change.filters, cursor: undefined };
  }
}

/** A listing Select value back to the price filter (`any` clears it). */
export function priceFilterFrom<T>(value: T): ProductPriceFilter | undefined {
  return PRODUCT_PRICE_FILTERS.find((filter) => filter === value);
}

/** A listing Select value back to the URL sort (`featured` is the default). */
export function sortFrom<T>(value: T): ProductsSearch['sort'] {
  const sort = PRODUCT_SORTS.find((candidate) => candidate === value);
  return sort === 'featured' ? undefined : sort;
}
