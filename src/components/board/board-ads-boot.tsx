'use client';
import { useEffect } from 'react';

import { ensureAdSenseScript } from './adsense-script';
import { useAdMedia } from './board-ad-media';
import { useBoardAdPreview } from './board-ad-preview';
import { useBoardAds } from './board-ads-provider';

import { useCookieConsent } from '@/components/cookie-consent';

/**
 * Load AdSense on public ad pages (`adPage`) without requesting or
 * simulating anchor ads.
 *
 * With Google's consent message (`ads.googleConsentMessage`) the tag loads
 * on page load on every route (ad page or not), for every visitor and
 * viewport, without waiting for the board's banner, so Google's CMP can ask
 * EEA/UK/CH visitors wherever they land. Manual ad slots still
 * render only on ad pages; with Auto ads or anchors on, Google may place ads
 * on any page, and owners can add AdSense page exclusions if they want
 * (docs/advertising.md). Google's message governs AdSense then, so a decline
 * on the board's banner does not withdraw it.
 */
export function BoardAdsBoot({
  adPage = true,
  hasMobileBottomBar = false,
}: {
  adPage?: boolean;
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
      (!adPage && !googleMode) ||
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
    adPage,
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
