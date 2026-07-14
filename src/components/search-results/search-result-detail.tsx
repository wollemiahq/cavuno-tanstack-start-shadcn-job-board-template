import type { ComponentPropsWithRef, ReactNode } from 'react';

import { cn } from '@/lib/utils';

export type SearchResultDetailProps = Omit<
  ComponentPropsWithRef<'section'>,
  'aria-label' | 'children'
> & {
  label: string;
  scrollRestorationId?: string;
  children: ReactNode;
};

/** The desktop-only, independently scrolling detail projection. */
export function SearchResultDetail({
  label,
  scrollRestorationId = 'search-result-detail',
  className,
  children,
  ref,
  ...props
}: SearchResultDetailProps) {
  return (
    <section
      {...props}
      ref={ref}
      aria-label={label}
      data-slot="search-result-detail"
      data-scroll-restoration-id={scrollRestorationId}
      tabIndex={0}
      className={cn(
        'focus-visible:ring-ring hidden min-w-0 outline-none focus-visible:ring-2 focus-visible:ring-inset md:block md:h-full md:min-h-0 md:overflow-y-auto md:overscroll-contain',
        className,
      )}
    >
      {children}
    </section>
  );
}
