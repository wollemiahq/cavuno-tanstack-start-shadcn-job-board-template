'use client';
import { useEffect } from 'react';

import { ensureAdSenseScript } from './adsense-script';
import { useAdMedia } from './board-ad-media';
import { useBoardAdPreview } from './board-ad-preview';
import { useBoardAds } from './board-ads-provider';

import { useCookieConsent } from '@/components/cookie-consent';

/** Load AdSense on public pages without requesting or simulating anchor ads. */
export function BoardAdsBoot({
  hasMobileBottomBar = false,
}: {
  hasMobileBottomBar?: boolean;
}) {
  const ads = useBoardAds();
  const { required, choice } = useCookieConsent();
  const { previewAds } = useBoardAdPreview();
  const eligibleViewport = useAdMedia(
    hasMobileBottomBar ? '(min-width: 1024px)' : '(min-width: 320px)',
  );
  useEffect(() => {
    if (
      !eligibleViewport ||
      previewAds ||
      (required && choice !== 'accepted') ||
      !ads.enabled ||
      !ads.clientId
    )
      return;
    ensureAdSenseScript(ads.clientId);
  }, [
    eligibleViewport,
    previewAds,
    required,
    choice,
    ads.enabled,
    ads.clientId,
  ]);
  return null;
}
