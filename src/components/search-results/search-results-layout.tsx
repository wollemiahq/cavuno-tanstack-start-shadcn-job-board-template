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

type SearchResultsToolbarProps = {
  startAd?: ReactElement<AdRailProps>;
  endAd?: ReactElement<AdRailProps>;
  children: ReactNode;
};

function frameClassName(hasStartAd: boolean, hasEndAd: boolean) {
  return cn(
    'mx-auto grid w-full max-w-[calc(var(--layout-width)+4rem)] max-w-full min-w-0 grid-cols-1 md:px-8',
    hasStartAd &&
      !hasEndAd &&
      'min-[1600px]:max-w-[96rem] min-[1600px]:grid-cols-[10rem_minmax(0,80rem)] min-[1600px]:gap-8',
    !hasStartAd &&
      hasEndAd &&
      'min-[1440px]:max-w-[96rem] min-[1440px]:grid-cols-[minmax(0,80rem)_10rem] min-[1440px]:gap-8',
    // The start rail is hidden below 1600px, leaving the end-only grid.
    hasStartAd &&
      hasEndAd &&
      'min-[1440px]:max-w-[96rem] min-[1440px]:grid-cols-[minmax(0,80rem)_10rem] min-[1440px]:gap-8 min-[1600px]:max-w-[108rem] min-[1600px]:grid-cols-[10rem_minmax(0,80rem)_10rem]',
  );
}

/** Keeps filters aligned with the result core as advertising rails appear. */
export function SearchResultsToolbar({
  startAd,
  endAd,
  children,
}: SearchResultsToolbarProps) {
  const hasStartAd = startAd !== undefined;
  const hasEndAd = endAd !== undefined;

  return (
    <div
      data-slot="search-results-toolbar"
      data-start-ad={hasStartAd}
      data-end-ad={hasEndAd}
      className={cn(frameClassName(hasStartAd, hasEndAd), 'px-4')}
    >
      <div
        data-slot="search-results-toolbar-core"
        className={cn('min-w-0 py-3', hasStartAd && 'min-[1600px]:col-start-2')}
      >
        {children}
      </div>
    </div>
  );
}

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
        frameClassName(hasStartAd, hasEndAd),
        'md:h-full md:min-h-0',
        className,
      )}
    >
      {startAd ? cloneElement(startAd, { side: 'start' }) : null}
      <div
        data-slot="search-results-core"
        className={cn(
          'grid w-full max-w-full min-w-0 grid-cols-1 md:h-full md:min-h-0 md:grid-cols-[20rem_minmax(0,1fr)] xl:grid-cols-[24rem_minmax(0,1fr)]',
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
