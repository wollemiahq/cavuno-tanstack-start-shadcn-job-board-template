'use client';
import { useEffect } from 'react';

import { ensureAdSenseScript } from './adsense-script';
import { useAdMedia } from './board-ad-media';
import { useBoardAdPreview } from './board-ad-preview';
import { BoardAdSlot } from './board-ad-slot';
import { useBoardAds } from './board-ads-provider';

import { useCookieConsent } from '@/components/cookie-consent';

/** Google owns the real anchor. Preview dimensions illustrate a compact bar,
 * not a guarantee of Google's serving size. No manual unit is made sticky here. */
export function BoardAdFooter({
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
  const showPreview = eligibleViewport && previewAds;
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
  useEffect(() => {
    if (!showPreview) return;
    const media = window.matchMedia('(min-width: 768px)');
    const update = () =>
      document.documentElement.style.setProperty(
        '--board-ad-footer-height',
        `calc(${media.matches ? 90 : 50}px + env(safe-area-inset-bottom))`,
      );
    update();
    media.addEventListener('change', update);
    return () => {
      media.removeEventListener('change', update);
      document.documentElement.style.removeProperty('--board-ad-footer-height');
    };
  }, [showPreview]);
  if (!showPreview) return null;
  return (
    <>
      <div aria-hidden className="h-[var(--board-ad-footer-height,0px)]" />
      <div
        data-slot="board-ad-footer"
        className="bg-background/95 fixed inset-x-0 bottom-0 z-(--z-floating-stack) flex justify-center pb-[env(safe-area-inset-bottom)] shadow-lg backdrop-blur print:hidden"
      >
        <BoardAdSlot placement="page:footer" layout="footer" />
      </div>
    </>
  );
}
