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
export function SearchResultsList({
  label,
  scrollRestorationId = 'search-results-list',
  className,
  children,
  ...props
}: SearchResultsListProps) {
  return (
    <section
      {...props}
      aria-label={label}
      data-slot="search-results-list"
      data-scroll-restoration-id={scrollRestorationId}
      className={cn(
        'min-w-0 overflow-x-hidden md:h-full md:min-h-0 md:overflow-y-auto',
        className,
      )}
    >
      {children}
    </section>
  );
}
