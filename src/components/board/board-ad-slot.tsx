'use client';
import { useEffect, useRef, useState } from 'react';

import { ensureAdSenseScript } from './adsense-script';
import { useAdMedia } from './board-ad-media';
import { useBoardAdPreview } from './board-ad-preview';
import { useBoardAds } from './board-ads-provider';

import { isWorkingPreviewHostname } from '@/components/analytics-preview';
import { useCookieConsent } from '@/components/cookie-consent';
import type { BoardAdsConfig } from '@/lib/board-ads';
import { resolveAdsSlot } from '@/lib/site-ads';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages';
export type AdStatus = 'pending' | 'filled' | 'unfilled';
export function BoardAdSlot({
  placement = 'custom',
  ads: suppliedAds,
  slotId: overrideSlotId,
  className,
  layout = 'responsive',
  media,
  onStatusChange,
}: {
  placement?: string;
  ads?: BoardAdsConfig;
  slotId?: string;
  className?: string;
  layout?: 'responsive' | 'rail' | 'rectangle';
  media?: string;
  onStatusChange?: (status: AdStatus) => void;
}) {
  const contextAds = useBoardAds();
  const ads = suppliedAds ?? contextAds;
  const { previewAds } = useBoardAdPreview();
  const { required, choice } = useCookieConsent();
  const visible = useAdMedia(media);
  const slot = resolveAdsSlot(placement, ads.defaultSlotId, overrideSlotId);
  const allowed = !required || choice === 'accepted';
  if (!visible) return null;
  if (previewAds) {
    return (
      <div
        data-ad-preview={placement}
        role="complementary"
        aria-label={`${m.adRail_label()}: ${placement}`}
        className={cn(
          'border-primary/40 bg-primary/10 text-primary flex flex-col items-center justify-center gap-1 border border-dashed text-center',
          layout === 'rail'
            ? 'h-[600px] w-40'
            : layout === 'rectangle'
              ? 'h-[250px] w-[300px] max-w-full'
              : 'min-h-[250px] w-full',
          className,
        )}
      >
        <span className="text-xs font-semibold tracking-widest">
          {m.adPreview_placeholder()}
        </span>
      </div>
    );
  }
  if (
    !allowed ||
    !ads.enabled ||
    !ads.clientId ||
    !slot ||
    isWorkingPreviewHostname(globalThis.window?.location.hostname ?? '')
  )
    return null;
  return (
    <AdUnit
      key={`${ads.clientId}:${slot.slotId}:${layout}`}
      placement={placement}
      clientId={ads.clientId}
      slot={slot}
      layout={layout}
      className={className}
      onStatusChange={onStatusChange}
    />
  );
}
function AdUnit({
  placement,
  clientId,
  slot,
  layout,
  className,
  onStatusChange,
}: {
  placement: string;
  clientId: string;
  slot: NonNullable<ReturnType<typeof resolveAdsSlot>>;
  layout: 'responsive' | 'rail' | 'rectangle';
  className?: string;
  onStatusChange?: (status: AdStatus) => void;
}) {
  const unitRef = useRef<HTMLModElement>(null);
  const requested = useRef(false);
  const callback = useRef(onStatusChange);
  callback.current = onStatusChange;
  const [status, setStatus] = useState<AdStatus>('pending');
  useEffect(() => {
    const unit = unitRef.current;
    if (!unit) return;
    const update = () => {
      const value = unit.getAttribute('data-ad-status');
      if (value === 'filled' || value === 'unfilled') {
        setStatus(value);
        callback.current?.(value);
      }
    };
    const observer = new MutationObserver(update);
    observer.observe(unit, {
      attributes: true,
      attributeFilter: ['data-ad-status'],
    });
    if (!requested.current) {
      requested.current = true;
      ensureAdSenseScript(clientId);
      // SAFETY: AdSense owns this optional global queue; we initialize it before use.
      const adsWindow = window as Window & { adsbygoogle?: unknown[] };
      adsWindow.adsbygoogle = adsWindow.adsbygoogle ?? [];
      adsWindow.adsbygoogle.push({});
    }
    update();
    return () => observer.disconnect();
  }, [clientId]);
  return (
    <div
      data-ad-placement={placement}
      hidden={status === 'unfilled'}
      className={cn(status === 'unfilled' && 'hidden', className)}
    >
      <ins
        ref={unitRef}
        className="adsbygoogle"
        data-ad-client={clientId}
        data-ad-slot={slot.slotId}
        data-ad-format={
          slot.format ?? (layout === 'responsive' ? 'auto' : undefined)
        }
        data-ad-layout={slot.layout}
        data-full-width-responsive={
          layout === 'responsive' ? 'true' : undefined
        }
        style={
          layout === 'rail'
            ? { display: 'block', width: '160px', height: '600px' }
            : layout === 'rectangle'
              ? { display: 'block', width: '300px', height: '250px' }
              : { display: 'block' }
        }
      />
    </div>
  );
}
