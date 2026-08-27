'use client';

import { useEffect, useState, type ReactElement, type ReactNode } from 'react';

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

const RAIL_MIN_WIDTH = '(min-width: 1600px)';

function useMinWidth1600(): boolean {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(RAIL_MIN_WIDTH);
    const sync = () => setWide(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  return wide;
}

/** Seek-style 160×600 rail, or an explicit test override. Collapses when ads are off. */
export function listingAdRail(
  override: AdPlacement | undefined,
  side: 'start' | 'end',
  ads: BoardAdsConfig,
  wide: boolean,
): ReactElement<AdRailProps> | undefined {
  if (override) {
    return <AdRail label={override.label}>{override.content}</AdRail>;
  }
  if (!wide || !ads.enabled || !ads.clientId) return undefined;
  const placement = side === 'start' ? 'search:rail.start' : 'search:rail.end';
  if (!adsSlot(placement)) return undefined;
  return (
    <AdRail label={m.adRail_label()}>
      <BoardAdSlot
        placement={placement}
        clientId={ads.clientId}
        layout="rail"
      />
    </AdRail>
  );
}

export function useListingAdRails(
  ads: BoardAdsConfig,
  startOverride?: AdPlacement,
  endOverride?: AdPlacement,
) {
  const wide = useMinWidth1600();
  return {
    startAd: listingAdRail(startOverride, 'start', ads, wide),
    endAd: listingAdRail(endOverride, 'end', ads, wide),
  };
}
