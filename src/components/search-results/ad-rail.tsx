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

/** A provider-neutral 160 × 600 advertising seam for wide viewports. */
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
        'hidden min-h-[600px] w-40 min-w-40 self-start overflow-hidden',
        // The optional second rail waits for room beside the full 80rem core.
        side === 'start' ? 'min-[1600px]:block' : 'xl:block',
        className,
      )}
    >
      {children}
    </aside>
  );
}
