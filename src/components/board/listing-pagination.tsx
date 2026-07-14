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

export function ListingPagination({
  page,
  count,
  pageSize,
  onPageChange,
}: {
  page: number;
  count: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  if (!shouldRenderPagination(count, pageSize)) return null;

  const total = totalPages(count, pageSize);
  const navigate =
    (nextPage: number) => (event: React.MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      if (nextPage !== page && nextPage >= 1 && nextPage <= total)
        onPageChange(nextPage);
    };

  return (
    <Pagination aria-label={m.pagination_ariaLabel()}>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href="#"
            text={m.pagination_previousLabel()}
            aria-label={m.pagination_previousPageLabel()}
            aria-disabled={page === 1}
            tabIndex={page === 1 ? -1 : undefined}
            onClick={navigate(page - 1)}
          />
        </PaginationItem>
        {visiblePages(page, total).map((item) => (
          <PaginationItem key={item}>
            {typeof item === 'number' ? (
              <PaginationLink
                href="#"
                isActive={item === page}
                aria-label={`${m.pagination_ariaLabel()} ${item}`}
                onClick={navigate(item)}
              >
                {item}
              </PaginationLink>
            ) : (
              <PaginationEllipsis />
            )}
          </PaginationItem>
        ))}
        <PaginationItem>
          <PaginationNext
            href="#"
            text={m.pagination_nextLabel()}
            aria-label={m.pagination_nextPageLabel()}
            aria-disabled={page === total}
            tabIndex={page === total ? -1 : undefined}
            onClick={navigate(page + 1)}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
