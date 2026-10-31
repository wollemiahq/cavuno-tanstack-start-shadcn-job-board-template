/**
 * Digital products: the store listing, product pages and checkout, over
 * `board.products.*`. Reads are gated content (the board password applies to
 * the catalogue like any other content); head meta and the Product JSON-LD
 * are computed here so the route modules stay free of SEO builders.
 *
 * Checkout refusals are expected outcomes (sold out, below the minimum, rate
 * limited), so they come back as `{ ok: false, code }` for the form to word
 * under its field rather than as thrown errors.
 */
import { isBoardApiError, isNotFound } from '@cavuno/board';
import { BOARD_PATHS, productPath } from '@cavuno/board/paths';
import { createBreadcrumbJsonLd } from '@cavuno/board/seo';
import { notFound } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';

import { productJsonLd } from '../board/product-json-ld';
import { getBoard } from '../lib/board';
import {
  boardAccessMiddleware,
  type BoardAccessContext,
} from '../lib/board-access-middleware';
import { readBoardContext } from '../lib/board-context-cache';
import { headTitle } from '../lib/page-title';
import { readPublicOrigin } from '../lib/public-origin';
import { selfUrl } from '../lib/self-url';
import { m } from '../paraglide/messages';
import { gatedRead } from './board-access';

import { breadcrumbsCopy } from '@/copy-groups/breadcrumbs';
import type {
  Product,
  ProductCheckout,
  ProductCheckoutBody,
  ProductReviewListEnvelope,
  ProductsListQuery,
} from '@cavuno/board';

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
type JsonObject = { [key: string]: JsonValue };

function asJsonObjects<T>(value: T): JsonObject[] {
  // SAFETY: structured data is composed from literal schema.org objects and
  // JSON round-tripped to erase readonly helper types before serialization.
  return JSON.parse(JSON.stringify(value)) as JsonObject[];
}

async function seoBase() {
  const [boardContext, origin] = await Promise.all([
    readBoardContext(),
    readPublicOrigin(),
  ]);
  return { boardName: boardContext.name, origin };
}

/** Reviews shown on the product page before "Show all reviews". */
export const PRODUCT_REVIEWS_PAGE_SIZE = 5;
export const PRODUCTS_PAGE_SIZE = 24;

export type ProductsListInput = {
  q?: string;
  price?: 'free' | 'paid';
  sort?: ProductsListQuery['sort'];
  cursor?: string;
};

/**
 * Whether the board lists any product, asked after a page came back empty.
 * An unfiltered first page already answers it (the sort only reorders); a
 * search, price filter or page cursor needs one unfiltered read.
 */
async function boardListsProducts(
  data: ProductsListInput,
  headers: Record<string, string>,
): Promise<boolean> {
  if (!data.q && !data.price && !data.cursor) return false;
  const any = await getBoard().products.list({ limit: 1 }, { headers });
  return any.data.length > 0;
}

/** `/products` — one page of listed products plus head + breadcrumb JSON-LD. */
export const getProductsPage = createServerFn({ method: 'GET' })
  .validator((input: ProductsListInput) => input)
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, async (headers) => {
      const [page, seo] = await Promise.all([
        getBoard().products.list(
          {
            q: data.q || undefined,
            price: data.price,
            sort: data.sort,
            cursor: data.cursor,
            limit: PRODUCTS_PAGE_SIZE,
          },
          { headers },
        ),
        seoBase(),
      ]);
      // A board with no listed products has no store: /products is a 404,
      // like /memberships without a membership plan. An empty filtered page
      // only 404s when the board has nothing listed at all.
      if (
        page.data.length === 0 &&
        !(await boardListsProducts(data, headers))
      ) {
        throw notFound();
      }
      const canonical = selfUrl(seo.origin, BOARD_PATHS.products);
      const filtered = Boolean(
        data.q || data.price || data.sort || data.cursor,
      );
      const c = breadcrumbsCopy();
      return {
        page,
        head: {
          meta: [
            { title: headTitle(seo.boardName, m.products_metaTitle()) },
            {
              name: 'description',
              content: m.products_metaDescription({ boardName: seo.boardName }),
            },
            // Filtered and paged views consolidate into the plain listing.
            ...(filtered
              ? [{ name: 'robots', content: 'noindex, follow' }]
              : []),
          ],
          links: [{ rel: 'canonical', href: canonical }],
        },
        jsonLd: asJsonObjects(
          [
            createBreadcrumbJsonLd([
              { label: c.home, href: selfUrl(seo.origin, '/') },
              { label: m.products_metaTitle() },
            ]),
          ].filter((entry) => entry !== null),
        ),
      };
    }),
  );

async function readReviews(
  product: Product,
  headers: Record<string, string>,
): Promise<ProductReviewListEnvelope | null> {
  if (!product.ratingsEnabled) return null;
  // Reviews never block the product page: a failed read renders without them.
  return getBoard()
    .products.reviews(
      product.slug,
      { limit: PRODUCT_REVIEWS_PAGE_SIZE },
      { headers },
    )
    .catch(() => null);
}

/** `/products/$productSlug` — product, first reviews, head and JSON-LD. */
export const getProductPage = createServerFn({ method: 'GET' })
  .validator((input: { productSlug: string }) => input)
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, async (headers) => {
      let product: Product;
      try {
        product = await getBoard().products.get(data.productSlug, { headers });
      } catch (error) {
        if (isNotFound(error)) throw notFound();
        throw error;
      }
      const [reviews, seo] = await Promise.all([
        readReviews(product, headers),
        seoBase(),
      ]);
      const canonical = selfUrl(seo.origin, productPath(product.slug));
      const description =
        product.summary ??
        m.product_metaDescription({
          productName: product.name,
          boardName: seo.boardName,
        });
      const image = product.images[0] ?? null;
      const c = breadcrumbsCopy();
      return {
        product,
        reviews,
        canonical,
        head: {
          meta: [
            { title: headTitle(seo.boardName, product.name) },
            { name: 'description', content: description },
            { property: 'og:title', content: product.name },
            { property: 'og:description', content: description },
            { property: 'og:url', content: canonical },
            { property: 'og:type', content: 'product' },
            ...(image ? [{ property: 'og:image', content: image }] : []),
            // Unlisted products are link-only: keep them out of indexes.
            ...(product.isListed
              ? []
              : [{ name: 'robots', content: 'noindex, nofollow' }]),
          ],
          links: [{ rel: 'canonical', href: canonical }],
        },
        jsonLd: product.isListed
          ? asJsonObjects(
              [
                productJsonLd(product, canonical),
                createBreadcrumbJsonLd([
                  { label: c.home, href: selfUrl(seo.origin, '/') },
                  {
                    label: m.products_metaTitle(),
                    href: selfUrl(seo.origin, BOARD_PATHS.products),
                  },
                  { label: product.name },
                ]),
              ].filter((entry) => entry !== null),
            )
          : [],
      };
    }),
  );

/** "Show all reviews": the next page of a product's reviews. */
export const getProductReviews = createServerFn({ method: 'GET' })
  .validator((input: { productSlug: string; cursor?: string }) => input)
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, (headers) =>
      getBoard().products.reviews(
        data.productSlug,
        { cursor: data.cursor, limit: 20 },
        { headers },
      ),
    ),
  );

/** A refusal the buyer can act on: the form words it from `code`. */
export type ProductActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: string | null; message: string };

async function asResult<T>(
  run: () => Promise<T>,
): Promise<ProductActionResult<T>> {
  try {
    return { ok: true, data: await run() };
  } catch (error) {
    if (isBoardApiError(error)) {
      return { ok: false, code: error.code, message: error.message };
    }
    throw error;
  }
}

/** Never let a foreign URL become Stripe's `return_url`. */
function assertRelative(path: string): string {
  if (!path.startsWith('/') || path.startsWith('//')) {
    throw new Error('returnPath must be a relative path');
  }
  return path;
}

function viewerHeaders(context: BoardAccessContext) {
  // The bearer (when signed in) files the purchase under the account too.
  return context.boardAccessHeaders;
}

export type ProductCheckoutInput = {
  productSlug: string;
  email: string;
  answers: ProductCheckoutBody['answers'];
  amountCents?: number;
  jobAlertOptIn?: boolean;
  website?: string;
  returnPath: string;
};

/**
 * Claim a free product (`complete` + the download page) or open an embedded
 * Stripe Checkout for a paid one (`open` + the mount kit).
 */
export const startProductCheckout = createServerFn({ method: 'POST' })
  .validator((input: ProductCheckoutInput) => {
    assertRelative(input.returnPath);
    return input;
  })
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    asResult<ProductCheckout>(() =>
      getBoard().products.checkout(
        data.productSlug,
        {
          email: data.email,
          answers: data.answers ?? [],
          amountCents: data.amountCents,
          jobAlertOptIn: data.jobAlertOptIn,
          // Omitted unless a bot filled the hidden field.
          website: data.website || undefined,
          returnPath: data.returnPath,
        },
        { headers: viewerHeaders(context), cache: 'no-store' },
      ),
    ),
  );

/** After Stripe returns the buyer: `awaiting_payment` until it is `paid`. */
export const getProductCheckoutState = createServerFn({ method: 'GET' })
  .validator((input: { productSlug: string; sessionId: string }) => input)
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    asResult(() =>
      getBoard().products.getCheckout(data.productSlug, data.sessionId, {
        headers: viewerHeaders(context),
        cache: 'no-store',
      }),
    ),
  );

/** "Email me my link again": always accepted, whatever the email. */
export const resendPurchaseLink = createServerFn({ method: 'POST' })
  .validator(
    (input: { email: string; productSlug?: string; website?: string }) => input,
  )
  .handler(({ data }) =>
    asResult(() =>
      getBoard().purchases.resend(
        {
          email: data.email,
          productSlug: data.productSlug || undefined,
          website: data.website || undefined,
        },
        { cache: 'no-store' },
      ),
    ),
  );
