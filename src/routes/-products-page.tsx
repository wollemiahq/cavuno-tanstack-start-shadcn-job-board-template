/**
 * `/products` — the store listing: a toolbar with search, price filter and
 * sort, then a responsive grid of product cards (cover, name, summary,
 * price, rating), each linking to its product page.
 */
import { useState, type FormEvent } from 'react';

import { Link, useLocation, useRouter } from '@tanstack/react-router';
import { ArrowUpDown, Search, ShoppingBag } from 'lucide-react';

import { m } from '../paraglide/messages';

import { CursorPagination } from '@/components/board/cursor-pagination';
import { ProductGridCard } from '@/components/board/product-ui';
import { Container } from '@/components/layout/container';
import { Page } from '@/components/layout/page';
import { SearchResultsToolbar } from '@/components/search-results/search-results';
import { buttonVariants } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cursorPageHref } from '@/lib/pagination';
import {
  priceFilterFrom,
  sortFrom,
  type ProductsSearch,
  type ProductsSearchChange,
} from '@/lib/products-search';
import type { ProductCardListEnvelope } from '@cavuno/board';

const ANY_PRICE = 'any';

export function ProductsPageView({
  page,
  search,
  onSearchChange,
}: {
  page: ProductCardListEnvelope;
  search: ProductsSearch;
  /** Navigate to the listing's next search (see `nextProductsSearch`). */
  onSearchChange: (
    change: ProductsSearchChange,
    options?: { replace?: boolean },
  ) => void;
}) {
  const router = useRouter();
  const currentHref = useLocation({ select: (location) => location.href });
  const products = page.data;
  const filtered = Boolean(search.q || search.price);
  const complete = !search.cursor && !page.hasMore;

  const priceItems = [
    { value: ANY_PRICE, label: m.products_anyPriceLabel() },
    { value: 'free', label: m.products_freePriceLabel() },
    { value: 'paid', label: m.products_paidPriceLabel() },
  ];
  const sortItems = [
    { value: 'featured', label: m.products_sortFeaturedLabel() },
    { value: 'newest', label: m.products_sortNewestLabel() },
    { value: 'rating', label: m.products_sortRatingLabel() },
    { value: 'price_asc', label: m.products_sortPriceLabel() },
  ];

  const toolbar = (
    <div className="border-border border-b">
      <SearchResultsToolbar>
        <div
          data-slot="products-toolbar"
          className="flex flex-wrap items-center gap-2"
        >
          <ProductSearchField
            key={search.q ?? ''}
            initial={search.q ?? ''}
            onSubmit={(q) =>
              onSearchChange({
                kind: 'filter',
                filters: { q: q || undefined },
              })
            }
          />
          <Select
            items={priceItems}
            value={search.price ?? ANY_PRICE}
            onValueChange={(value) =>
              onSearchChange({
                kind: 'filter',
                filters: { price: priceFilterFrom(value) },
              })
            }
          >
            <SelectTrigger aria-label={m.products_priceFilterLabel()}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="start">
              <SelectGroup>
                {priceItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Select
            items={sortItems}
            value={search.sort ?? 'featured'}
            onValueChange={(value) =>
              onSearchChange({
                kind: 'filter',
                filters: { sort: sortFrom(value) },
              })
            }
          >
            <SelectTrigger
              aria-label={m.products_sortLabel()}
              className="ms-auto"
            >
              <ArrowUpDown aria-hidden="true" />
              <span>{m.products_sortLabel()}:</span>
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectGroup>
                {sortItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </SearchResultsToolbar>
    </div>
  );

  return (
    <Page width="wide">
      <main data-layout="products-page" className="pb-10">
        {toolbar}
        {products.length === 0 ? (
          <Empty className="min-h-[calc(100dvh-16rem)] border-0">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ShoppingBag aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>{m.products_metaTitle()}</EmptyTitle>
              <EmptyDescription>
                {filtered ? m.products_noMatchText() : m.products_emptyText()}
              </EmptyDescription>
            </EmptyHeader>
            {filtered ? (
              <EmptyContent>
                <Link to="/products" className={buttonVariants()}>
                  {m.jobSearch_resetFiltersAction()}
                </Link>
              </EmptyContent>
            ) : null}
          </Empty>
        ) : (
          <Container width="wide">
            <section
              aria-label={m.products_resultsRegionLabel()}
              className="flex flex-col gap-4 pt-6"
            >
              <h1 className="text-foreground text-lg font-semibold tracking-tight">
                {complete
                  ? m.products_count({ count: products.length })
                  : m.products_metaTitle()}
              </h1>
              <ul
                data-slot="products-grid"
                className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              >
                {products.map((product) => (
                  <li key={product.slug}>
                    <ProductGridCard product={product} />
                  </li>
                ))}
              </ul>
              <CursorPagination
                hasPrevious={Boolean(search.cursor)}
                hasNext={Boolean(page.hasMore && page.nextCursor)}
                nextHref={
                  page.nextCursor
                    ? cursorPageHref(currentHref, page.nextCursor, [])
                    : undefined
                }
                onPrevious={() => router.history.back()}
                onNext={() =>
                  onSearchChange({
                    kind: 'page',
                    cursor: page.nextCursor ?? undefined,
                  })
                }
              />
            </section>
          </Container>
        )}
      </main>
    </Page>
  );
}

function ProductSearchField({
  initial,
  onSubmit,
}: {
  initial: string;
  onSubmit: (q: string) => void;
}) {
  const [value, setValue] = useState(initial);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(value.trim());
  }
  return (
    <form
      role="search"
      onSubmit={submit}
      className="w-full sm:w-auto sm:min-w-72"
    >
      <InputGroup>
        <InputGroupInput
          type="search"
          name="q"
          value={value}
          maxLength={200}
          placeholder={m.products_searchPlaceholder()}
          aria-label={m.products_searchLabel()}
          onChange={(event) => setValue(event.target.value)}
        />
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            type="submit"
            size="icon-xs"
            aria-label={m.products_searchLabel()}
          >
            <Search aria-hidden="true" />
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </form>
  );
}
