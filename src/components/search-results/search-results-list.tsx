import { forwardRef } from 'react';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';

import { cn } from '@/lib/utils';

export type SearchResultsListProps = Omit<
  ComponentPropsWithoutRef<'section'>,
  'aria-label' | 'children'
> & {
  label: string;
  scrollRestorationId?: string;
  children: ReactNode;
};

/** The independently scrolling master region of a search-results surface. */
export const SearchResultsList = forwardRef<
  HTMLElement,
  SearchResultsListProps
>(function SearchResultsList(
  {
    label,
    scrollRestorationId = 'search-results-list',
    className,
    children,
    ...props
  },
  ref,
) {
  return (
    <section
      {...props}
      ref={ref}
      aria-label={label}
      data-slot="search-results-list"
      data-scroll-restoration-id={scrollRestorationId}
      className={cn(
        'min-w-0 overflow-x-hidden md:h-full md:min-h-0 md:overflow-y-auto',
        className,
      )}
    >
      {/* The one content-padding contract shared by jobs, companies, and
          talent: vertical inset only. The column's horizontal gutters come
          from the search-results grid, so this must NOT add side padding
          (an asymmetric right inset was leaving a gap beside the sticky
          results header). */}
      <div className="space-y-4 py-4">{children}</div>
    </section>
  );
});
