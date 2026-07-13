/**
 * Page-based pagination for the listing surfaces (CAV-496) — the pure math
 * behind the `?page=N` URL contract. The loaders turn a 1-based page into the
 * Board API's zero-based `offset`; the components turn a result `count` into a
 * page total for the Untitled UI pagination nav.
 *
 * The `?page=` param is 1-based and public input, so parsing never throws:
 * anything invalid (missing, `< 1`, fractional, non-numeric) collapses to
 * page 1. Page 1 serialises to a CLEAN URL — `pageSearchValue` returns
 * `undefined` for it so TanStack drops the search param entirely.
 */

/** Coerce a raw `?page=` search value to a valid 1-based page number. */
export function parsePageParam(raw: unknown): number {
  const value = typeof raw === "number" ? raw : Number(raw);
  return Number.isInteger(value) && value >= 1 ? value : 1;
}

/** The `?page=` value to store in the URL — `undefined` for page 1 (clean URL). */
export function pageSearchValue(page: number): number | undefined {
  return page > 1 ? page : undefined;
}

/** Zero-based API offset for a 1-based page. */
export function pageToOffset(page: number, pageSize: number): number {
  return (page - 1) * pageSize;
}

/** Number of pages a result `count` spans at this page size. */
export function totalPages(count: number, pageSize: number): number {
  return Math.ceil(count / pageSize);
}

/** Whether the pagination nav should render — only once a second page exists. */
export function shouldRenderPagination(count: number, pageSize: number): boolean {
  return totalPages(count, pageSize) > 1;
}
