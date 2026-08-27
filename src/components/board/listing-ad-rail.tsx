import type { ReactElement, ReactNode } from 'react';

import { m } from '../../paraglide/messages';

import { BoardAdSlot } from '@/components/board/board-ad-slot';
import {
  AdRail,
  type AdRailProps,
} from '@/components/search-results/search-results';
import type { BoardAdsConfig } from '@/lib/board-ads';
import { adsSlot } from '@/lib/site-ads';

export type AdPlacement = {
  label: string;
  content: ReactNode;
};

/** Seek-style 160×600 rail, or an explicit test override. Collapses when ads are off. */
export function listingAdRail(
  override: AdPlacement | undefined,
  side: 'start' | 'end',
  ads: BoardAdsConfig,
): ReactElement<AdRailProps> | undefined {
  if (override) {
    return <AdRail label={override.label}>{override.content}</AdRail>;
  }
  if (!ads.enabled || !ads.clientId) return undefined;
  const placement = side === 'start' ? 'search:rail.start' : 'search:rail.end';
  if (!adsSlot(placement)) return undefined;
  return (
    <AdRail label={m.adRail_label()}>
      <BoardAdSlot placement={placement} clientId={ads.clientId} />
    </AdRail>
  );
}
