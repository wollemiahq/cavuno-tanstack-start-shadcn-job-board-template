'use client';
import { useEffect } from 'react';

import { ensureAdSenseScript } from './adsense-script';
import { useAdMedia } from './board-ad-media';
import { useBoardAdPreview } from './board-ad-preview';
import { useBoardAds } from './board-ads-provider';

import { useCookieConsent } from '@/components/cookie-consent';

/**
 * Load AdSense on public pages without requesting or simulating anchor ads.
 *
 * With Google's consent message (`ads.googleConsentMessage`) the tag loads
 * on page load for every visitor and viewport, without waiting for the
 * board's banner, so Google's CMP can ask EEA/UK/CH visitors. That includes
 * mobile job pages with the Apply bar: keep bottom anchors off there in
 * AdSense (see the README). Google's message governs AdSense then, so a
 * decline on the board's banner does not withdraw it.
 */
export function BoardAdsBoot({
  hasMobileBottomBar = false,
}: {
  hasMobileBottomBar?: boolean;
}) {
  const ads = useBoardAds();
  const googleMode = ads.googleConsentMessage === true;
  const { adsAllowed, markAnalyticsLoaded } = useCookieConsent();
  const { previewAds } = useBoardAdPreview();
  const eligibleViewport = useAdMedia(
    googleMode
      ? undefined
      : hasMobileBottomBar
        ? '(min-width: 1024px)'
        : '(min-width: 320px)',
  );
  useEffect(() => {
    if (
      !eligibleViewport ||
      previewAds ||
      !adsAllowed ||
      !ads.enabled ||
      !ads.clientId
    )
      return;
    if (ensureAdSenseScript(ads.clientId) && !googleMode) {
      markAnalyticsLoaded();
    }
  }, [
    eligibleViewport,
    previewAds,
    adsAllowed,
    googleMode,
    ads.enabled,
    ads.clientId,
    markAnalyticsLoaded,
  ]);
  return null;
}
