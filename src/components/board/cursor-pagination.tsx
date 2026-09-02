'use client';

import { m } from '../../paraglide/messages';

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { cn } from '@/lib/utils';

/**
 * Previous/Next pagination for CURSOR-only listings — the blog archives, the
 * talent directory, and free-text company search. Their public SDK endpoints
 * page by opaque forward cursor (they reject `offset` and return no total
 * `count`), so numbered pages (`ListingPagination`) are impossible; this mirrors
 * the hosted board's Previous/Next affordance on the same shadcn pagination
 * primitives instead of a bespoke "load more" button.
 *
 * `Next` is a real, crawlable anchor pointing at the next cursor URL (SEO); the
 * `onNext` handler upgrades the click to an in-app navigation. `Previous` has no
 * backward cursor to link to, so it walks router history back and disables on
 * the first page.
 */
export function CursorPagination({
  hasPrevious,
  hasNext,
  nextHref = '#',
  onPrevious,
  onNext,
}: {
  hasPrevious: boolean;
  hasNext: boolean;
  /** Crawlable href for the next cursor page; anchor semantics + SEO. */
  nextHref?: string;
  onPrevious?: () => void;
  onNext?: () => void;
}) {
  if (!hasPrevious && !hasNext) return null;

  return (
    <Pagination aria-label={m.pagination_ariaLabel()}>
      <PaginationContent className="gap-2">
        <PaginationItem>
          <PaginationPrevious
            href="#"
            text={m.pagination_previousLabel()}
            aria-label={m.pagination_previousPageLabel()}
            aria-disabled={!hasPrevious}
            tabIndex={hasPrevious ? undefined : -1}
            className={cn(!hasPrevious && 'pointer-events-none opacity-50')}
            onClick={(event) => {
              event.preventDefault();
              if (hasPrevious) onPrevious?.();
            }}
          />
        </PaginationItem>
        <PaginationItem>
          <PaginationNext
            href={nextHref}
            text={m.pagination_nextLabel()}
            aria-label={m.pagination_nextPageLabel()}
            aria-disabled={!hasNext}
            tabIndex={hasNext ? undefined : -1}
            className={cn(!hasNext && 'pointer-events-none opacity-50')}
            onClick={(event) => {
              event.preventDefault();
              if (hasNext) onNext?.();
            }}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
