'use client';

import { useEffect, useState, type ReactElement, type ReactNode } from 'react';

import { m } from '../../paraglide/messages';
import { useBoardAdPreview } from './board-ad-preview';

import { BoardAdSlot } from '@/components/board/board-ad-slot';
import { useCookieConsent } from '@/components/cookie-consent';
import {
  AdRail,
  type AdRailProps,
} from '@/components/search-results/search-results';
import type { BoardAdsConfig } from '@/lib/board-ads';
import { adsSlot, resolveAdsSlot } from '@/lib/site-ads';

export type AdPlacement = {
  label: string;
  content: ReactNode;
};

// One rail fits once the core keeps ~68rem; shorter screens get the in-list
// rectangle instead, so the 600px unit is never clipped below the header.
const RAIL_MIN_WIDTH = '(min-width: 1280px) and (min-height: 700px)';
// A second rail leaves the core under ~60rem until very wide viewports.
const DUAL_RAIL_MIN_WIDTH = '(min-width: 1600px) and (min-height: 700px)';

function useMediaMatch(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const sync = () => setMatches(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, [query]);
  return matches;
}

/** Seek-style 160×600 rail, or an explicit test override. Collapses when ads are off. */
export function listingAdRail(
  override: AdPlacement | undefined,
  side: 'start' | 'end',
  ads: BoardAdsConfig,
  wide: boolean,
  preview = false,
): ReactElement<AdRailProps> | undefined {
  if (override) {
    return <AdRail label={override.label}>{override.content}</AdRail>;
  }
  if (!wide) return undefined;
  if (!preview && (!ads.enabled || !ads.clientId)) return undefined;
  const placement = side === 'start' ? 'search:rail.start' : 'search:rail.end';
  if (side === 'start' && !adsSlot(placement)) return undefined;
  if (!preview && !resolveAdsSlot(placement, ads.defaultSlotId))
    return undefined;
  return (
    <AdRail label={m.adRail_label()}>
      {wide ? (
        <BoardAdSlot placement={placement} ads={ads} layout="rail" />
      ) : null}
    </AdRail>
  );
}

export function useListingAdRails(
  ads: BoardAdsConfig,
  startOverride?: AdPlacement,
  endOverride?: AdPlacement,
) {
  const wide = useMediaMatch(RAIL_MIN_WIDTH);
  const dualWide = useMediaMatch(DUAL_RAIL_MIN_WIDTH);
  const { previewAds } = useBoardAdPreview();
  const { required, choice } = useCookieConsent();
  const allowed = previewAds || !required || choice === 'accepted';
  return {
    startAd: listingAdRail(
      startOverride,
      'start',
      ads,
      dualWide && allowed,
      previewAds,
    ),
    endAd: listingAdRail(endOverride, 'end', ads, wide && allowed, previewAds),
  };
}
