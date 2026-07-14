import {
  cloneElement,
  type ComponentPropsWithoutRef,
  type ReactElement,
  type ReactNode,
} from 'react';

import type { AdRailProps } from './ad-rail';
import { cn } from '@/lib/utils';

export type SearchResultsLayoutProps = Omit<
  ComponentPropsWithoutRef<'div'>,
  'children'
> & {
  list: ReactNode;
  detail: ReactNode;
  startAd?: ReactElement<AdRailProps>;
  endAd?: ReactElement<AdRailProps>;
};

/** Responsive master–detail geometry with optional outer advertising rails. */
export function SearchResultsLayout({
  list,
  detail,
  startAd,
  endAd,
  className,
  ...props
}: SearchResultsLayoutProps) {
  const hasStartAd = startAd !== undefined;
  const hasEndAd = endAd !== undefined;

  return (
    <div
      {...props}
      data-slot="search-results-layout"
      data-start-ad={hasStartAd}
      data-end-ad={hasEndAd}
      className={cn(
        'mx-auto grid w-full max-w-[var(--layout-width)] grid-cols-1 md:h-full md:min-h-0',
        hasStartAd &&
          !hasEndAd &&
          'min-[1600px]:max-w-[92rem] min-[1600px]:grid-cols-[10rem_minmax(0,80rem)] min-[1600px]:gap-8',
        !hasStartAd &&
          hasEndAd &&
          'min-[1600px]:max-w-[92rem] min-[1600px]:grid-cols-[minmax(0,80rem)_10rem] min-[1600px]:gap-8',
        hasStartAd &&
          hasEndAd &&
          'min-[1600px]:max-w-[104rem] min-[1600px]:grid-cols-[10rem_minmax(0,80rem)_10rem] min-[1600px]:gap-8',
        className,
      )}
    >
      {startAd ? cloneElement(startAd, { side: 'start' }) : null}
      <div
        data-slot="search-results-core"
        className={cn(
          'grid min-w-0 grid-cols-1 md:h-full md:min-h-0 md:grid-cols-[20rem_minmax(0,1fr)] xl:grid-cols-[24rem_minmax(0,1fr)]',
          hasStartAd && 'min-[1600px]:col-start-2',
        )}
      >
        {list}
        {detail}
      </div>
      {endAd ? cloneElement(endAd, { side: 'end' }) : null}
    </div>
  );
}
