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
          talent. On mobile the master column is full-width, so this wrapper
          supplies the page gutter for cards, pagination, and related-search
          chips. From the desktop split view onward, SearchResultsLayout owns
          the outer gutter and the list sits flush against the detail pane. */}
      <div className="space-y-4 px-4 py-4 md:px-0">{children}</div>
    </section>
  );
});
