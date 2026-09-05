/**
 * Page-based pagination for the listing surfaces — the pure math
 * behind the `?page=N` URL contract. The loaders turn a 1-based page into the
 * Board API's zero-based `offset`; the components turn a result `count` into a
 * page total for the owned shadcn pagination nav.
 *
 * The `?page=` param is 1-based and public input, so parsing never throws:
 * anything invalid (missing, `< 1`, fractional, non-numeric) collapses to
 * page 1. Page 1 serialises to a CLEAN URL — `pageSearchValue` returns
 * `undefined` for it so TanStack drops the search param entirely.
 */
import {
  defaultParseSearch,
  defaultStringifySearch,
} from '@tanstack/react-router';

export type UrlSearchValue =
  | string
  | string[]
  | number
  | boolean
  | null
  | undefined;
export type UrlSearchInput = Record<string, UrlSearchValue>;

function valueTag<T>(value: T): string {
  return Object.prototype.toString.call(value);
}

export function searchString<T>(value: T): string | undefined {
  if (valueTag(value) !== '[object String]') return undefined;
  const text = String(value);
  return text ? text : undefined;
}

export function searchNumber<T>(value: T): number | undefined {
  if (valueTag(value) !== '[object Number]') return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

/**
 * Coerce a raw `?cursor=` search value to an opaque cursor string.
 *
 * Cursors are opaque tokens the API mints; some (e.g. the list endpoint's
 * `"2"`) look numeric. The router parses search with JSON semantics, so a
 * `?cursor=2` document load hands `validateSearch` back the NUMBER `2`. A
 * naive `typeof === 'string'` guard then drops it, and the route
 * 307-redirects to the bare archive — the cursor page URL is dead for
 * crawlers and new-tab opens. Coerce any finite scalar to its string form so
 * a numeric-looking cursor survives instead of being silently stripped.
 */
export function cursorSearchValue<T>(raw: T): string | undefined {
  const tag = valueTag(raw);
  if (tag === '[object String]') return String(raw).trim() || undefined;
  if (tag === '[object Number]' && Number.isFinite(Number(raw)))
    return String(raw);
  return undefined;
}

/** Coerce a raw `?page=` search value to a valid 1-based page number. */
export function parsePageParam<T>(raw: T): number {
  const value = Number(raw);
  return Number.isInteger(value) && value >= 1 ? value : 1;
}

/** The `?page=` value to store in the URL — `undefined` for page 1 (clean URL). */
export function pageSearchValue(page: number): number | undefined {
  return page > 1 ? page : undefined;
}

/** Build a real pagination URL while preserving the listing's active filters. */
export function listingPageHref(
  currentHref: string,
  page: number,
  transientParams: string[] = [],
): string {
  const url = new URL(currentHref, 'https://board.local');

  for (const param of transientParams) url.searchParams.delete(param);

  if (page > 1) url.searchParams.set('page', String(page));
  else url.searchParams.delete('page');

  return `${url.pathname}${url.search}${url.hash}`;
}

/**
 * Build a crawlable "next page" URL for a CURSOR-paginated listing (the blog,
 * the talent directory, and free-text company search — surfaces whose public
 * SDK endpoint is cursor-only and rejects `offset`). Sets the opaque `cursor`
 * and drops the page-based `?page=` param so the two pagination models never
 * mix in one URL.
 *
 * The search string is (de)serialised with the router's OWN default codec, not
 * `URLSearchParams`. That matters for numeric-looking cursors: the router
 * encodes the string `"2"` as `cursor=%222%22` (JSON-quoted) and re-parses it
 * back to the string `"2"`. A plain `URLSearchParams` `cursor=2` re-parses as
 * the number `2`, fails the string guard, and 307-redirects the page URL to
 * the bare archive — a dead crawlable href. Emitting the router-canonical form
 * makes a direct GET of the Next link SSR the cursor page with a 200, no
 * redirect hop.
 */
export function cursorPageHref(
  currentHref: string,
  cursor: string,
  transientParams: string[] = [],
): string {
  const url = new URL(currentHref, 'https://board.local');
  // SAFETY: TanStack's default search codec only yields URL-serializable
  // scalar values for this route-owned pagination map.
  const search = defaultParseSearch(url.search) as UrlSearchInput;

  for (const param of transientParams) delete search[param];

  delete search.page;
  search.cursor = cursor;

  return `${url.pathname}${defaultStringifySearch(search)}${url.hash}`;
}

/**
 * The Board API's deep-offset ceiling: any catalog read whose
 * `offset + limit` exceeds this is refused with a 400
 * (`pagination_offset_too_large`) rather than served slowly. `?page=` is
 * public input, so a page past the window must never reach the API as-is —
 * an uncaught 400 in a loader is a 500 for the visitor (seen live on a board
 * with more than 10k results in one listing: `?page=500` rendered,
 * `?page=600` crashed).
 */
export const MAX_OFFSET_WINDOW = 10_000;

/** The last 1-based page whose full window still fits under the API ceiling. */
export function lastReachablePage(pageSize: number): number {
  return Math.max(1, Math.floor(MAX_OFFSET_WINDOW / pageSize));
}

/** Clamp a 1-based page to the API-reachable range. */
export function clampPage(page: number, pageSize: number): number {
  return Math.min(page, lastReachablePage(pageSize));
}

/**
 * Zero-based API offset for a 1-based page. Clamped so `offset + pageSize`
 * never exceeds {@link MAX_OFFSET_WINDOW} — a deeper page serves the last
 * reachable one instead of crashing the loader.
 */
export function pageToOffset(page: number, pageSize: number): number {
  return (clampPage(page, pageSize) - 1) * pageSize;
}

/**
 * Number of pages a result `count` spans at this page size, capped at the
 * last API-reachable page so the pagination nav never links into the 400.
 */
export function totalPages(count: number, pageSize: number): number {
  return Math.min(Math.ceil(count / pageSize), lastReachablePage(pageSize));
}

/** Whether the pagination nav should render — only once a second page exists. */
export function shouldRenderPagination(
  count: number,
  pageSize: number,
): boolean {
  return totalPages(count, pageSize) > 1;
}
