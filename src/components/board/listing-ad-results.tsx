import { Children, Fragment, type ReactNode } from 'react';

import { BoardAdSlot } from './board-ad-slot';

import type { BoardAdsConfig } from '@/lib/board-ads';

/** An in-list rectangle when the outer skyscraper cannot fit. */
export function ListingAdResults({
  ads,
  children,
}: {
  ads: BoardAdsConfig;
  children: ReactNode;
}) {
  const results = Children.toArray(children);
  const after = Math.min(3, results.length);
  return (
    <div className="space-y-3">
      {results.map((result, index) => (
        <Fragment key={index}>
          {result}
          {index + 1 === after && (
            <BoardAdSlot
              ads={ads}
              placement="search:inline"
              layout="rectangle"
              className="mx-auto w-[300px] max-w-full"
              media="(min-width: 332px) and (max-width: 1279px), (min-width: 332px) and (max-height: 699px)"
            />
          )}
        </Fragment>
      ))}
    </div>
  );
}
