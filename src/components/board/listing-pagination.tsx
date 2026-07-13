"use client";

/**
 * Page-based pagination nav for the listing surfaces (CAV-496) — a thin,
 * typed-props wrapper over the vendored Untitled UI `PaginationPageDefault`
 * (page numbers + prev/next). Dumb by design: the current page and total come
 * from the route loader, and a page click goes back out through `onPageChange`
 * as a URL navigation — never local state, so `/jobs?page=3` SSRs page 3.
 *
 * Renders nothing until there is a second page (`shouldRenderPagination`), so
 * every listing can drop it in below its grid unconditionally.
 */
import { PaginationPageDefault } from "@/components/application/pagination/pagination";
import { shouldRenderPagination, totalPages } from "@/lib/pagination";

export function ListingPagination({
    page,
    count,
    pageSize,
    onPageChange,
}: {
    /** The current 1-based page. */
    page: number;
    /** Total matching results (the API list envelope's `count`). */
    count: number;
    /** Items per page — the loader `limit` for this surface. */
    pageSize: number;
    /** Navigate to a 1-based page (the route rewrites the `?page=` URL). */
    onPageChange: (page: number) => void;
}) {
    if (!shouldRenderPagination(count, pageSize)) return null;

    return <PaginationPageDefault page={page} total={totalPages(count, pageSize)} onPageChange={onPageChange} />;
}
