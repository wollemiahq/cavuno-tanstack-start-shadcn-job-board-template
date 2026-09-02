'use client';

import { m } from '../../paraglide/messages';

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { shouldRenderPagination, totalPages } from '@/lib/pagination';


type PaginationPage = number | 'start-ellipsis' | 'end-ellipsis';

const paginationScrollTarget =
  '[data-pagination-scroll-target], [data-slot="search-results-list"]';

function visiblePages(page: number, total: number): PaginationPage[] {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
  if (page <= 4) return [1, 2, 3, 4, 5, 'end-ellipsis', total];
  if (page >= total - 3) {
    return [
      1,
      'start-ellipsis',
      total - 4,
      total - 3,
      total - 2,
      total - 1,
      total,
    ];
  }
  return [1, 'start-ellipsis', page - 1, page, page + 1, 'end-ellipsis', total];
}

function compactVisiblePages(page: number, total: number): PaginationPage[] {
  if (total <= 5) return Array.from({ length: total }, (_, index) => index + 1);
  if (page <= 3) return [1, 2, 3, 'end-ellipsis', total];
  if (page >= total - 2) {
    return [1, 'start-ellipsis', total - 2, total - 1, total];
  }
  return [1, 'start-ellipsis', page, 'end-ellipsis', total];
}

export function ListingPagination({
  page,
  count,
  pageSize,
  hrefForPage,
  onPageChange,
  compact = false,
}: {
  page: number;
  count: number;
  pageSize: number;
  hrefForPage: (page: number) => string;
  onPageChange: (page: number) => void;
  compact?: boolean;
}) {
  if (!shouldRenderPagination(count, pageSize)) return null;

  const total = totalPages(count, pageSize);
  const navigate =
    (nextPage: number) => (event: React.MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      if (nextPage !== page && nextPage >= 1 && nextPage <= total) {
        const list = event.currentTarget.closest<HTMLElement>(
          paginationScrollTarget,
        );

        // Search results own their vertical scroll on desktop, while the
        // document owns it on mobile. Reset both so every page starts at the
        // beginning of the listing in either layout.
        list?.scrollIntoView?.({ block: 'start' });
        list?.scrollTo?.({ top: 0 });
        onPageChange(nextPage);
      }
    };

  return (
    <Pagination
      aria-label={m.pagination_ariaLabel()}
      data-compact={compact ? 'true' : undefined}
    >
      <PaginationContent className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        <PaginationItem className="justify-self-start">
          <PaginationPrevious
            href={hrefForPage(Math.max(1, page - 1))}
            text={m.pagination_previousLabel()}
            aria-label={m.pagination_previousPageLabel()}
            aria-disabled={page === 1}
            tabIndex={page === 1 ? -1 : undefined}
            size={compact ? 'icon' : 'default'}
            showText={!compact}
            onClick={navigate(page - 1)}
          />
        </PaginationItem>
        <li
          data-slot="pagination-pages"
          className="max-w-full min-w-0 scrollbar-none justify-self-center overflow-x-auto"
        >
          <ul className="flex w-max items-center gap-1">
            {(compact
              ? compactVisiblePages(page, total)
              : visiblePages(page, total)
            ).map((item) => {
              const pageItem = Number.isInteger(item) ? Number(item) : null;
              return (
                <PaginationItem key={item}>
                  {pageItem !== null ? (
                    <PaginationLink
                      href={hrefForPage(pageItem)}
                      isActive={pageItem === page}
                      aria-label={`${m.pagination_ariaLabel()} ${pageItem}`}
                      onClick={navigate(pageItem)}
                    >
                      {pageItem}
                    </PaginationLink>
                  ) : (
                    <PaginationEllipsis />
                  )}
                </PaginationItem>
              );
            })}
          </ul>
        </li>
        <PaginationItem className="justify-self-end">
          <PaginationNext
            href={hrefForPage(Math.min(total, page + 1))}
            text={m.pagination_nextLabel()}
            aria-label={m.pagination_nextPageLabel()}
            aria-disabled={page === total}
            tabIndex={page === total ? -1 : undefined}
            size={compact ? 'icon' : 'default'}
            showText={!compact}
            onClick={navigate(page + 1)}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
