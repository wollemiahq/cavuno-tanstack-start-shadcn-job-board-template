import type { ComponentPropsWithoutRef, ReactNode } from 'react';

import { cn } from '@/lib/utils';

export type AdRailProps = Omit<
  ComponentPropsWithoutRef<'aside'>,
  'aria-label' | 'children'
> & {
  label: string;
  children: ReactNode;
  side?: 'start' | 'end';
};

/** A provider-neutral 160 × 600 advertising seam for very wide viewports. */
export function AdRail({
  label,
  side,
  className,
  children,
  ...props
}: AdRailProps) {
  return (
    <aside
      {...props}
      aria-label={label}
      data-slot="ad-rail"
      data-side={side}
      className={cn(
        'sticky top-6 hidden min-h-[600px] w-40 min-w-40 self-start overflow-hidden min-[1600px]:block',
        className,
      )}
    >
      {children}
    </aside>
  );
}
